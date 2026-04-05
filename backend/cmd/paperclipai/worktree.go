package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var worktreeCmd = &cobra.Command{
	Use:   "worktree",
	Short: "Manage workspace code checkouts",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(" paperclipai worktree ")
		fmt.Println("----------------------")
		fmt.Println("(Stub: Worktree commands pending)")
	},
}

func init() {
	rootCmd.AddCommand(worktreeCmd)
}
