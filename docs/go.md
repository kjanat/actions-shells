# Go

```yaml
- shell: actions-shell go {0}
  run: |
    package main
    import "fmt"
    func main() {
        fmt.Println("hello from Go")
    }
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Install Go and put `go` on `PATH`, for example with `actions/setup-go` or mise.

## Invocation and flags

The source must declare `package main` and `func main()`. The adapter prepares a sibling `.go` file, runs `go build [flags] -o <binary> <script.go>`, and executes the resulting binary. Direct execution preserves the status from `os.Exit(n)`.

Put build flags before `{0}`, for example `shell: actions-shell go -tags=integration {0}`. These arguments go to `go build`. The adapter does not pass them to the compiled program. This runtime has no aliases.

## Dependencies and constraints

Go resolves imported modules using the step's working directory and normal module configuration. Check out your repository and download its modules before the step when the script imports project dependencies. The adapter builds only the generated script file, so other `.go` files are not automatically compiled into it.

A failed build stops the step before execution. The adapter removes the prepared source and executable after the run, including on failure. Set `ACTIONS_SHELL_KEEP=1` to retain them for inspection.
