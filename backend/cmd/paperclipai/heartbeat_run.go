package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var heartbeatRunCmd = &cobra.Command{
	Use:   "heartbeat-run",
	Short: "Trigger a heartbeat run",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(" paperclipai heartbeat-run ")
		fmt.Println("---------------------------")
		fmt.Println("(Stub: Heartbeat execution pending)")
	},
}

func init() {
	rootCmd.AddCommand(heartbeatRunCmd)
}
