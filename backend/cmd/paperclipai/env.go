package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var envCmd = &cobra.Command{
	Use:   "env",
	Short: "Print environment details",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(" paperclipai env ")
		fmt.Println("-----------------")
		fmt.Println("(Stub: Env dumping pending)")
	},
}

func init() {
	rootCmd.AddCommand(envCmd)
}
