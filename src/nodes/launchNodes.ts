// src/nodes/launchNodes.ts

import { Value } from "../types";
import { node } from "./node";

export async function launchNodes(
    N: number,
    F: number,
    initialValues: Value[],
    faultyList: boolean[]
) {
  if (initialValues.length !== faultyList.length || N !== initialValues.length)
    throw new Error("Arrays don't match");
  if (faultyList.filter((el) => el === true).length !== F)
    throw new Error("faultyList doesnt have F faulties");

  const promises = [];

  const nodesStates = new Array(N).fill(false);

  function nodesAreReady() {
    return nodesStates.find((el) => el === false) === undefined;
  }

  function setNodeIsReady(index: number) {
    nodesStates[index] = true;
  }

  // launch nodes
  for (let index = 0; index < N; index++) {
    const new_Promise = node(
        index, N, F, initialValues[index], faultyList[index], nodesAreReady, setNodeIsReady
    );
    promises.push(new_Promise);
  }

  const servers = await Promise.all(promises);

  return servers;
}
