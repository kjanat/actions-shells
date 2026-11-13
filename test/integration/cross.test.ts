import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cli = path.resolve(import.meta.dirname, '../../cli.mjs');
const enabled = process.env.ACTIONS_SHELL_TEST_CROSS === '1' && process.platform === 'linux';
const target = process.env.ACTIONS_SHELL_TEST_CROSS_TARGET ?? 'aarch64-unknown-linux-gnu';

describe.skipIf(!enabled)('cross with a real container engine', () => {
	let dir: string;
	let workspace: string;
	let script: string;
	let env: NodeJS.ProcessEnv;
	beforeEach(() => {
		dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-e2e 'cross "));
		workspace = path.join(dir, 'workspace');
		mkdirSync(workspace);
		script = path.join(dir, 'extensionless-step');
		env = { ...process.env, ACTIONS_SHELL_DEBUG: '1', GITHUB_WORKSPACE: workspace };
		for (const key of ['GITHUB_OUTPUT', 'GITHUB_ENV', 'GITHUB_PATH', 'GITHUB_STEP_SUMMARY', 'GITHUB_STATE']) {
			env[key] = path.join(dir, key);
			writeFileSync(env[key], '');
		}
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	function run() {
		return spawnSync(process.execPath, [cli, 'cross', '--target', target, script], {
			cwd: workspace,
			env,
			encoding: 'utf8',
			timeout: 300_000,
		});
	}

	function expectClean(stderr: string) {
		const packageDir = stderr.match(/--pkg-path (\S+) --base-path/)?.[1];
		expect(packageDir, stderr).toBeDefined();
		expect(existsSync(packageDir as string)).toBe(false);
		expect(existsSync(script)).toBe(true);
	}

	it('executes embedded dependencies on the target with workspace, passthrough and GitHub file access', () => {
		mkdirSync(path.join(workspace, 'dependency', 'src'), { recursive: true });
		writeFileSync(
			path.join(workspace, 'dependency', 'Cargo.toml'),
			'[package]\nname = "fixture"\nversion = "0.1.0"\nedition = "2021"\n',
		);
		writeFileSync(
			path.join(workspace, 'dependency', 'src/lib.rs'),
			'pub fn message() -> &\'static str { "from dependency" }',
		);
		writeFileSync(path.join(workspace, 'Cross.toml'), '[build.env]\npassthrough = ["INLINE_TEST_MESSAGE"]\n');
		writeFileSync(path.join(workspace, 'fixture.txt'), 'from workspace');
		env.INLINE_TEST_MESSAGE = 'explicit passthrough';
		env.PRIVATE_TEST_MESSAGE = 'not forwarded';
		const source = `//! \`\`\`cargo
//! [dependencies]
//! fixture = { path = "./dependency" }
//! serde_json = "1"
//! \`\`\`
assert_eq!(std::env::consts::ARCH, "${target.startsWith('aarch64-') ? 'aarch64' : 'x86_64'}");
assert_eq!(fixture::message(), "from dependency");
assert_eq!(std::fs::read_to_string("fixture.txt").unwrap(), "from workspace");
assert_eq!(std::env::current_dir().unwrap().to_str().unwrap(), std::env::var("GITHUB_WORKSPACE").unwrap());
assert_eq!(std::env::var("INLINE_TEST_MESSAGE").unwrap(), "explicit passthrough");
assert!(std::env::var("PRIVATE_TEST_MESSAGE").is_err());
for key in ["GITHUB_OUTPUT", "GITHUB_ENV", "GITHUB_PATH", "GITHUB_STEP_SUMMARY", "GITHUB_STATE"] {
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new().append(true).open(std::env::var(key).unwrap()).unwrap();
    writeln!(file, "result=ok").unwrap();
}
println!("{}", serde_json::json!({"cross": "ok"}));
std::process::exit(42);
`;
		writeFileSync(script, source);
		const result = run();
		expect(result.status, result.stderr).toBe(42);
		expect(result.stdout).toContain('{"cross":"ok"}');
		for (const key of ['GITHUB_OUTPUT', 'GITHUB_ENV', 'GITHUB_PATH', 'GITHUB_STEP_SUMMARY', 'GITHUB_STATE']) {
			expect(readFileSync(env[key] as string, 'utf8')).toBe('result=ok\n');
		}
		expect(readFileSync(script, 'utf8')).toBe(source);
		expectClean(result.stderr);
	}, 300_000);

	it('propagates compiler failure and cleans the package', () => {
		writeFileSync(script, 'fn main() { nonexistent_function(); }');
		const result = run();
		expect(result.status, result.stderr).toBe(101);
		expect(result.stderr).toContain('nonexistent_function');
		expectClean(result.stderr);
	});

	it('stops the container on SIGTERM and preserves the signal exit code', async () => {
		writeFileSync(
			script,
			`fn main() {
    println!("ready-to-stop");
    std::thread::sleep(std::time::Duration::from_secs(2));
    std::fs::write("after-cancel", "still running").unwrap();
}`,
		);
		const child = spawn(process.execPath, [cli, 'cross', '--target', target, script], {
			cwd: workspace,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		let stopped = false;
		child.stdout.on('data', (data) => {
			stdout += data;
			if (!stopped && stdout.includes('ready-to-stop')) {
				stopped = true;
				child.kill('SIGTERM');
			}
		});
		child.stderr.on('data', (data) => {
			stderr += data;
		});
		const status = await new Promise<number | null>((resolve, reject) => {
			child.on('error', reject);
			child.on('exit', resolve);
		});
		expect(stopped, stderr).toBe(true);
		expect(status, stderr).toBe(143);
		await new Promise((resolve) => setTimeout(resolve, 2500));
		expect(existsSync(path.join(workspace, 'after-cancel'))).toBe(false);
		expectClean(stderr);
	});
});
