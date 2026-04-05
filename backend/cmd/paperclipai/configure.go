package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var configureCmd = &cobra.Command{
	Use:   "configure",
	Short: "Interactive configuration manager",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(" paperclipai configure ")
		fmt.Println("-----------------------")
		fmt.Println("(Stub: Configuration wizard pending)")
	},
}

func init() {
	rootCmd.AddCommand(configureCmd)
}
