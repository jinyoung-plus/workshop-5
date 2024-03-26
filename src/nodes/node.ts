// src/nodes/node.ts

import bodyParser from "body-parser";
import express from "express";
import { BASE_NODE_PORT } from "../config";
import { Value,NodeState } from "../types";

export async function node(
    nodeId: number,
    N: number,
    F: number,
    initialValue: Value,
    isFaulty: boolean,
    nodesAreReady: () => boolean,
    setNodeIsReady: (index: number) => void
) {
  const node = express();
  node.use(express.json());
  node.use(bodyParser.json());

  let nodeState: NodeState;

  nodeState = {
    killed: false,
    x: isFaulty ? null : initialValue,
    decided: isFaulty ? null : true,
    k: isFaulty ? null : 0
  };

  let receivedMessages: Value[] = [];
  const handleMessage = (message: Value) => {
    if (!nodeState.killed  && !isFaulty ) {
      receivedMessages.push(message);

      // Define the type for counts object
      const counts: Record<string, number> = receivedMessages.reduce<Record<string, number>>((acc, val) => {
        const key = String(val);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      // Check if the fault tolerance limit is exceeded
      if (F > (N - F)) { // 노드가 결정을 내리지 못하는 조건 체크
        nodeState.x = null;
        nodeState.decided = false;
        nodeState.k = null;
        return; // Don't proceed further if the fault tolerance is exceeded
      }

      let hasMajority = false;
      Object.entries(counts).forEach(([val, count]) => {
        if (count > (N / 2) && !isFaulty) {
          nodeState.x = parseInt(val, 10);
          nodeState.decided = true;
          hasMajority = true;
          nodeState.k = 1;
        }
      });

      // Increment k only if no majority is found and the node hasn't decided yet
      if (!hasMajority && !nodeState.decided && nodeState.k !== null) {
        nodeState.k++;
      }
    } else {
      // If the node is killed, reset its state
      nodeState.x = null;
      nodeState.decided = null;
      nodeState.k = null;
    }
  };


  // TODO implement this
  // this route allows retrieving the current status of the node
  node.get("/status", (req, res) => {
    if (isFaulty) {
      res.status(500).send("faulty");
    } else {
      res.status(200).send("live");
    }
  });

  // TODO implement this
  // this route allows the node to receive messages from other nodes
  node.post("/message", (req, res) => {
    const message: Value = req.body.message;
    handleMessage(message);
    res.sendStatus(200);
  });

  // TODO implement this
  // this route is used to start the consensus algorithm
  node.get("/start", async (req, res) => {
    if (nodesAreReady() ) {
      // Broadcast the initial value to all other nodes
      const broadcastPromises = [];
      for (let i = 0; i < N; i++) {
        if (i !== nodeId) {
          const port = BASE_NODE_PORT + i;
          broadcastPromises.push(
              fetch(`http://localhost:${port}/message`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: initialValue })
              })
          );
        }
      }
      await Promise.all(broadcastPromises);
      res.sendStatus(200);
    } else {
      res.sendStatus(500); // Nodes are not ready
    }
  });

  // Route to stop the consensus algorithm
  node.get("/stop", async (req, res) => {
    // Reset nodeState
    nodeState.killed = true;
    if (!isFaulty) { // 수정된 부분: 고장난 노드는 이미 null 상태이므로 변경하지 않음
      nodeState.x = null;
      nodeState.decided = null;
      nodeState.k = null;
    }
    res.sendStatus(200);
  });

  node.get("/getState", (req, res) => {
    res.json(nodeState);
  });

  // start the server
  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(
        `Node ${nodeId} is listening on port ${BASE_NODE_PORT + nodeId}`
    );

    // the node is ready
    setNodeIsReady(nodeId);
  });

  return server;
}
