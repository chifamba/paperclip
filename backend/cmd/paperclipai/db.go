package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var dbCmd = &cobra.Command{
	Use:   "db",
	Short: "Manage database (backup, restore, etc.)",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(" paperclipai db ")
		fmt.Println("----------------")
		fmt.Println("(Stub: DB management pending)")
	},
}

func init() {
	rootCmd.AddCommand(dbCmd)
}
