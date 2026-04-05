package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var routinesCmd = &cobra.Command{
	Use:   "routines",
	Short: "Manage background routines",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(" paperclipai routines ")
		fmt.Println("----------------------")
		fmt.Println("(Stub: Routines management pending)")
	},
}

func init() {
	rootCmd.AddCommand(routinesCmd)
}
