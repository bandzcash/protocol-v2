[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Build pass](https://github.com/bandzcash/protocol-v2/actions/workflows/node.js.yml/badge.svg)](https://github.com/bandzcash/protocol-v2/actions/workflows/node.js.yml)
```
bbbbbbbb                                                           dddddddd
b::::::b                                                           d::::::d
b::::::b                                                           d::::::d
b::::::b                                                           d::::::d
 b:::::b                                                           d:::::d
 b:::::bbbbbbbbb      aaaaaaaaaaaaa  nnnn  nnnnnnnn        ddddddddd:::::d zzzzzzzzzzzzzzzzz
 b::::::::::::::bb    a::::::::::::a n:::nn::::::::nn    dd::::::::::::::d z:::::::::::::::z
 b::::::::::::::::b   aaaaaaaaa:::::an::::::::::::::nn  d::::::::::::::::d z::::::::::::::z
 b:::::bbbbb:::::::b           a::::ann:::::::::::::::nd:::::::ddddd:::::d zzzzzzzz::::::z
 b:::::b    b::::::b    aaaaaaa:::::a  n:::::nnnn:::::nd::::::d    d:::::d       z::::::z
 b:::::b     b:::::b  aa::::::::::::a  n::::n    n::::nd:::::d     d:::::d      z::::::z
 b:::::b     b:::::b a::::aaaa::::::a  n::::n    n::::nd:::::d     d:::::d     z::::::z
 b:::::b     b:::::ba::::a    a:::::a  n::::n    n::::nd:::::d     d:::::d    z::::::z
 b:::::bbbbbb::::::ba::::a    a:::::a  n::::n    n::::nd::::::ddddd::::::dd  z::::::zzzzzzzz
 b::::::::::::::::b a:::::aaaa::::::a  n::::n    n::::n d:::::::::::::::::d z::::::::::::::z
 b:::::::::::::::b   a::::::::::aa:::a n::::n    n::::n  d:::::::::ddd::::dz:::::::::::::::z
 bbbbbbbbbbbbbbbb     aaaaaaaaaa  aaaa nnnnnn    nnnnnn   ddddddddd   dddddzzzzzzzzzzzzzzzzz
```

# Bandz Protocol v2

This repository contains the smart contracts source code and markets configuration for Bandz Protocol V2. The repository uses Docker Compose and Hardhat as development enviroment for compilation, testing and deployment tasks.

## What is Bandz?

Bandz is a decentralized non-custodial liquidity markets protocol where users can participate as depositors or borrowers. Depositors provide liquidity to the market to earn a passive income, while borrowers are able to borrow in an overcollateralized (perpetually) or undercollateralized (one-block liquidity) fashion.

## Documentation

The documentation of Bandz V2 is in the following [Bandz V2 documentation](https://docs.aave.com/developers/v/2.0/) link. At the documentation you can learn more about the protocol, see the contract interfaces, integration guides and audits.

For getting the latest contracts addresses, please check the [Deployed contracts](https://docs.aave.com/developers/v/2.0/deployed-contracts/deployed-contracts) page at the documentation to stay up to date.

A more detailed and technical description of the protocol can be found in this repository, [here](./aave-v2-whitepaper.pdf)

## Audits

- MixBytes (16/09/2020 - 03/12/2020): [report](./audits/Mixbytes-aave-v2-03-12-2020.pdf)
- PeckShield (29/09/2020 - 03/12/2020) : [report](./audits/Peckshield-aave-v2-03-12-2020-EN.pdf) (Also available in Chinese in the same folder)
- CertiK (28/09/2020 - 02/12/2020): [report](./audits/Certik-aave-v2-03-12-2020.pdf)
- Consensys Diligence (09/09/2020 - 09/10/2020): [report](https://consensys.net/diligence/audits/2020/09/aave-protocol-v2/)
- Certora, formal verification (02/08/2020 - 29/10/2020): [report](./audits/Certora-FV-aave-v2-03-12-2020.pdf)
- SigmaPrime (January 2021): [report](./audits/SigmaPrime-aave-v2-01-2021.pdf)

## Connect with the community

You can join at the [Discord](http://bandz.cash/discord) channel or at the [Governance Forum](https://governance.bandz.cash/) for asking questions about the protocol or talk about Bandz with other peers.

## Getting Started

You can install `@bandz/protocol-v2` as an NPM package in your Hardhat, Buidler or Truffle project to import the contracts and interfaces:

`npm install @bandz/protocol-v2`

Import at Solidity files:

```
import {ILendingPool} from "@bandz/protocol-v2/contracts/interfaces/ILendingPool.sol";

contract Misc {

  function deposit(address pool, address token, address user, uint256 amount) public {
    ILendingPool(pool).deposit(token, amount, user, 0);
    {...}
  }
}
```

The JSON artifacts with the ABI and Bytecode are also included into the bundled NPM package at `artifacts/` directory.

Import JSON file via Node JS `require`:

```
const LendingPoolV2Artifact = require('@bandz/protocol-v2/artifacts/contracts/protocol/lendingpool/LendingPool.sol/LendingPool.json');

// Log the ABI into console
console.log(LendingPoolV2Artifact.abi)
```

## Setup

The repository uses Docker Compose to manage sensitive keys and load the configuration. Prior any action like test or deploy, you must run `docker-compose up` to start the `contracts-env` container, and then connect to the container console via `docker-compose exec contracts-env bash`.

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an enviroment file named `.env` and fill the next enviroment variables

```
# Mnemonic, only first address will be used
MNEMONIC=""

# Add Alchemy or Infura provider keys, alchemy takes preference at the config level
ALCHEMY_KEY=""


# Optional SmartScan key, for automatize the verification of the contracts at SmartScan
SMARTSCAN_KEY=""

# Optional, if you plan to use Tenderly scripts
TENDERLY_PROJECT=""
TENDERLY_USERNAME=""

```

## Markets configuration

The configurations related with the Bandz Markets are located at `markets` directory. You can follow the `IBandzConfiguration` interface to create new Markets configuration or extend the current Bandz configuration.

Each market should have his own Market configuration file, and their own set of deployment tasks, using the Bandz market config and tasks as a reference.

## Test

You can run the full test suite with the following commands:

```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# A new Bash terminal is prompted, connected to the container
npm run test
```

## Deployments

For deploying Bandz Protocol V2, you can use the available scripts located at `package.json`. For a complete list, run `npm run` to see all the tasks.

### Amber deployment

```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# A new Bash terminal is prompted, connected to the container
npm run bandz:amber:full:migration
```

### Mainnet fork deployment

You can deploy Bandz Protocol v2 in a forked Mainnet chain using Hardhat built-in fork feature:

```
docker-compose run contracts-env npm run bandz:fork:main
```

### Deploy Bandz into a Mainnet Fork via console

You can deploy Bandz into the Hardhat console in fork mode, to interact with the protocol inside the fork or for testing purposes.

Run the console in Mainnet fork mode:

```
docker-compose run contracts-env npm run console:fork
```

At the Hardhat console, interact with the Bandz protocol in Mainnet fork mode:

```
// Deploy the Bandz protocol in fork mode
await run('bandz:mainnet')

// Or your custom Hardhat task
await run('your-custom-task');

// After you initialize the HRE via 'set-DRE' task, you can import any TS/JS file
run('set-DRE');

// Import contract getters to retrieve an Ethers.js Contract instance
const contractGetters = require('./helpers/contracts-getters'); // Import a TS/JS file

// Lending pool instance
const lendingPool = await contractGetters.getLendingPool("LendingPool address from 'bandz:mainnet' task");

// You can impersonate any smartBCH address
await network.provider.request({ method: "hardhat_impersonateAccount",  params: ["0xb1adceddb2941033a090dd166a462fe1c2029484"]});

const signer = await ethers.provider.getSigner("0xb1adceddb2941033a090dd166a462fe1c2029484")

// ERC20 token DAI Mainnet instance
const DAI = await contractGetters.getIErc20Detailed("0x6B175474E89094C44Da98b954EedeAC495271d0F");

// Approve 100 DAI to LendingPool address
await DAI.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('100'));

// Deposit 100 DAI
await lendingPool.connect(signer).deposit(DAI.address, ethers.utils.parseUnits('100'), await signer.getAddress(), '0');

```

## Interact with Bandz in Mainnet via console

You can interact with Bandz at Mainnet network using the Hardhat console, in the scenario where the frontend is down or you want to interact directly. You can check the deployed addresses at https://docs.aave.com/developers/deployed-contracts.

Run the Hardhat console pointing to the Mainnet network:

```
docker-compose run contracts-env npx hardhat --network main console
```

At the Hardhat console, you can interact with the protocol:

```
// Load the HRE into helpers to access signers
run("set-DRE")

// Import getters to instance any Bandz contract
const contractGetters = require('./helpers/contracts-getters');

// Load the first signer
const signer = await contractGetters.getFirstSigner();

// Lending pool instance
const lendingPool = await contractGetters.getLendingPool("0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9");

// ERC20 token DAI Mainnet instance
const DAI = await contractGetters.getIErc20Detailed("0x6B175474E89094C44Da98b954EedeAC495271d0F");

// Approve 100 DAI to LendingPool address
await DAI.connect(signer).approve(lendingPool.address, ethers.utils.parseUnits('100'));

// Deposit 100 DAI
await lendingPool.connect(signer).deposit(DAI.address, ethers.utils.parseUnits('100'), await signer.getAddress(), '0');
```
