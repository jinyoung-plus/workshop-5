// src/start.ts
import { launchNetwork } from ".";
import { startConsensus } from "./nodes/consensus";
import { Value } from "./types";
import { delay } from "./utils";

async function main() {
  const faultyArray = [
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
  ];

  const initialValues: Value[] = [0, 0, 1, 1, 1, 0, 0, 1, 1, 0];

  if (initialValues.length !== faultyArray.length)
    throw new Error("Lengths don't match");

  if (
      faultyArray.filter((faulty) => faulty === true).length >
      initialValues.length / 2
  )
    throw new Error("Too many faulty nodes");

  try {
    await launchNetwork(
        initialValues.length,
        faultyArray.filter((el) => el === true).length,
        initialValues,
        faultyArray
    );

    await delay(200);

    await startConsensus(initialValues.length);
    console.log('Consensus algorithm started without errors.');
  } catch (error) {
    console.error('An error occurred during the consensus algorithm initialization:', error);
  }
}

main();

