/* Generated by ts-generator ver. 0.0.8 */
/* tslint:disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import { LendingPoolLiquidationManager } from "./LendingPoolLiquidationManager";

export class LendingPoolLiquidationManagerFactory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(overrides?: Overrides): Promise<LendingPoolLiquidationManager> {
    return super.deploy(overrides || {}) as Promise<
      LendingPoolLiquidationManager
    >;
  }
  getDeployTransaction(overrides?: Overrides): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): LendingPoolLiquidationManager {
    return super.attach(address) as LendingPoolLiquidationManager;
  }
  connect(signer: Signer): LendingPoolLiquidationManagerFactory {
    return super.connect(signer) as LendingPoolLiquidationManagerFactory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): LendingPoolLiquidationManager {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as LendingPoolLiquidationManager;
  }
}

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_collateral",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "_reserve",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "_user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_purchaseAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_liquidatedCollateralAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "address",
        name: "_liquidator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "_receiveAToken",
        type: "bool"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_timestamp",
        type: "uint256"
      }
    ],
    name: "LiquidationCall",
    type: "event"
  },
  {
    inputs: [],
    name: "addressesProvider",
    outputs: [
      {
        internalType: "contract LendingPoolAddressesProvider",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_collateral",
        type: "address"
      },
      {
        internalType: "address",
        name: "_reserve",
        type: "address"
      },
      {
        internalType: "address",
        name: "_user",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "_purchaseAmount",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "_receiveAToken",
        type: "bool"
      }
    ],
    name: "liquidationCall",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "reservesList",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

const _bytecode =
  "0x6080604052600060015534801561001557600080fd5b5060016000556121d38061002a6000396000f3fe6080604052600436106100335760003560e01c8062a718a9146100385780634fe7a6e5146100fb578063c72c4d1014610141575b600080fd5b61007c600480360360a081101561004e57600080fd5b506001600160a01b038135811691602081013582169160408201351690606081013590608001351515610156565b6040518083815260200180602001828103825283818151815260200191508051906020019080838360005b838110156100bf5781810151838201526020016100a7565b50505050905090810190601f1680156100ec5780820380516001836020036101000a031916815260200191505b50935050505060405180910390f35b34801561010757600080fd5b506101256004803603602081101561011e57600080fd5b5035610929565b604080516001600160a01b039092168252519081900360200190f35b34801561014d57600080fd5b50610125610950565b6001600160a01b03808516600090815260376020908152604080832089851684528184209488168452603890925282209192606092610193611f2b565b6001600160a01b03891660009081526038602090815260409182902082518083018452905481526039805484518185028101850190955280855261028c948e946037949391929083018282801561021357602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116101f5575b505060355460408051631f94a27560e31b815290516001600160a01b03909216945063fca513a893506004808201935060209291829003018186803b15801561025b57600080fd5b505afa15801561026f573d6000803e3d6000fd5b505050506040513d602081101561028557600080fd5b505161095f565b6101c08601819052670de0b6b3a76400001193506102d09250505057600460405180606001604052806028815260200161214c60289139955095505050505061091f565b6006830154604080516370a0823160e01b81526001600160a01b038c81166004830152915191909216916370a08231916024808301926020929190829003018186803b15801561031f57600080fd5b505afa158015610333573d6000803e3d6000fd5b505050506040513d602081101561034957600080fd5b50518152600061035b60058501610e3c565b11801561038a5750600983015460408051602081019091528354815261038a91600160d01b900460ff16610e51565b151561020082018190526103c05760026040518060600160405280602a81526020016120f8602a9139955095505050505061091f565b6103ca8985610e69565b6040830152602082018190521580156103e557506040810151155b156104125760036040518060600160405280602a8152602001612174602a9139955095505050505061091f565b61043f61138861043383604001518460200151610f6c90919063ffffffff16565b9063ffffffff610fcd16565b6060820181905288116104525787610458565b80606001515b60808201819052815161047391859187918f918f9190610ffb565b6101a083018190526101808301919091526080820151111561049b576101a081015160808201525b60068301546001600160a01b03166101e0820152866105785760008b6001600160a01b03166370a08231836101e001516040518263ffffffff1660e01b815260040180826001600160a01b03166001600160a01b0316815260200191505060206040518083038186803b15801561051157600080fd5b505afa158015610525573d6000803e3d6000fd5b505050506040513d602081101561053b57600080fd5b50516101808301519091508110156105765760056040518060600160405280603381526020016120c56033913996509650505050505061091f565b505b61058184611286565b608081015161059b9085908c90600063ffffffff61133e16565b8060800151816040015110610624576008840154608082015160408051632770a7eb60e21b81526001600160a01b038d81166004830152602482019390935290519190921691639dc29fac91604480830192600092919082900301818387803b15801561060757600080fd5b505af115801561061b573d6000803e3d6000fd5b5050505061072b565b60088401546040808301518151632770a7eb60e21b81526001600160a01b038d8116600483015260248201929092529151921691639dc29fac9160448082019260009290919082900301818387803b15801561067f57600080fd5b505af1158015610693573d6000803e3d6000fd5b505050506007840154604082015160808301516001600160a01b0390921691639dc29fac918c916106c391611685565b6040518363ffffffff1660e01b815260040180836001600160a01b03166001600160a01b0316815260200182815260200192505050600060405180830381600087803b15801561071257600080fd5b505af1158015610726573d6000803e3d6000fd5b505050505b86156107b3576101e08101516101808201516040805163f866c31960e01b81526001600160a01b038d8116600483015233602483015260448201939093529051919092169163f866c31991606480830192600092919082900301818387803b15801561079657600080fd5b505af11580156107aa573d6000803e3d6000fd5b50505050610856565b6107bc83611286565b6101808101516107d89084908d9060009063ffffffff61133e16565b6101e081015161018082015160408051633dae446f60e21b81526001600160a01b038d8116600483015233602483015260448201939093529051919092169163f6b911bc91606480830192600092919082900301818387803b15801561083d57600080fd5b505af1158015610851573d6000803e3d6000fd5b505050505b60068401546080820151610882916001600160a01b038d8116923392919091169063ffffffff6116c716565b60808082015161018083015160408051928352602083019190915233828201528915156060830152429282019290925290516001600160a01b03808c16928d821692918f16917f54343dd5791108d018f6fb8def2c14d746f777c51e9924962237813a527528709181900360a00190a46000604051806040016040528060098152602001684e6f206572726f727360b81b81525095509550505050505b9550959350505050565b6039818154811061093657fe5b6000918252602090912001546001600160a01b0316905081565b6035546001600160a01b031681565b600080600080600061096f611fc5565b61097889611727565b156109955750600094508493508392508291506000199050610e2f565b600060e08201525b87518160e001511015610d825760e08101516109c0908a9063ffffffff61172c16565b6109c957610d72565b878160e00151815181106109d957fe5b6020908102919091018101516001600160a01b031661020083018190526000908152908b905260409020610a0f6005820161173c565b6080860181905260c08601929092525060a0840191909152600a0a6020808401919091526102008301516040805163b3596f0760e01b81526001600160a01b0392831660048201529051918b169263b3596f0792602480840193829003018186803b158015610a7d57600080fd5b505afa158015610a91573d6000803e3d6000fd5b505050506040513d6020811015610aa757600080fd5b5051825260a082015115801590610acf575060e0820151610acf908b9063ffffffff610e5116565b15610c05576006810154604080516370a0823160e01b81526001600160a01b038f81166004830152915191909216916370a08231916024808301926020929190829003018186803b158015610b2357600080fd5b505afa158015610b37573d6000803e3d6000fd5b505050506040513d6020811015610b4d57600080fd5b50516040830181905260208301518351600092610b809291610b749163ffffffff61178316565b9063ffffffff6117dc16565b610120840151909150610b99908263ffffffff610f6c16565b61012084015260a0830151610bcb90610bb990839063ffffffff61178316565b6101808501519063ffffffff610f6c16565b61018084015260c0830151610bfd90610beb90839063ffffffff61178316565b6101a08501519063ffffffff610f6c16565b6101a0840152505b60e0820151610c1b908b9063ffffffff61181e16565b15610d70576007810154604080516370a0823160e01b81526001600160a01b038f81166004830152915191909216916370a08231916024808301926020929190829003018186803b158015610c6f57600080fd5b505afa158015610c83573d6000803e3d6000fd5b505050506040513d6020811015610c9957600080fd5b505160608301526008810154604080516370a0823160e01b81526001600160a01b038f811660048301529151610d319392909216916370a0823191602480820192602092909190829003018186803b158015610cf457600080fd5b505afa158015610d08573d6000803e3d6000fd5b505050506040513d6020811015610d1e57600080fd5b505160608401519063ffffffff610f6c16565b6060830181905260208301518351610d6992610d579291610b749163ffffffff61178316565b6101408401519063ffffffff610f6c16565b6101408301525b505b60e081018051600101905261099d565b600081610120015111610d96576000610db1565b610120810151610180820151610db19163ffffffff6117dc16565b610180820152610120810151610dc8576000610de3565b6101208101516101a0820151610de39163ffffffff6117dc16565b6101a08201819052610120820151610140830151610e009261182e565b61010082018190526101208201516101408301516101808401516101a090940151919850965091945090925090505b9550955095509550959050565b5460101c650fffffff0001600160f01b031690565b815160016002830281019190911c1615155b92915050565b6007810154604080516370a0823160e01b81526001600160a01b0385811660048301529151600093849316916370a08231916024808301926020929190829003018186803b158015610eba57600080fd5b505afa158015610ece573d6000803e3d6000fd5b505050506040513d6020811015610ee457600080fd5b50516008840154604080516370a0823160e01b81526001600160a01b038881166004830152915191909216916370a08231916024808301926020929190829003018186803b158015610f3557600080fd5b505afa158015610f49573d6000803e3d6000fd5b505050506040513d6020811015610f5f57600080fd5b5051909590945092505050565b600082820183811015610fc6576040805162461bcd60e51b815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b9392505050565b6000610fc6612710610b74610fe8868663ffffffff61178316565b60026127105b049063ffffffff610f6c16565b60355460408051631f94a27560e31b81529051600092839283926001600160a01b039092169163fca513a891600480820192602092909190829003018186803b15801561104757600080fd5b505afa15801561105b573d6000803e3d6000fd5b505050506040513d602081101561107157600080fd5b5051905061107d612066565b816001600160a01b031663b3596f07896040518263ffffffff1660e01b815260040180826001600160a01b03166001600160a01b0316815260200191505060206040518083038186803b1580156110d357600080fd5b505afa1580156110e7573d6000803e3d6000fd5b505050506040513d60208110156110fd57600080fd5b5051604080830191909152805163b3596f0760e01b81526001600160a01b03898116600483015291519184169163b3596f0791602480820192602092909190829003018186803b15801561115057600080fd5b505afa158015611164573d6000803e3d6000fd5b505050506040513d602081101561117a57600080fd5b5051606082015261118d60058b0161173c565b60c08501526020840152506111a6905060058a01611866565b60a08201819052602082015160408301516111ff92610433916111d191600a0a63ffffffff61178316565b610b748560c00151600a0a6111f38c886060015161178390919063ffffffff16565b9063ffffffff61178316565b6080820181905285101561126e57849350611267816020015161125b6112398460c00151600a0a856060015161178390919063ffffffff16565b610b748560a00151600a0a6111f38a886040015161178390919063ffffffff16565b9063ffffffff61187716565b9250611279565b806080015193508592505b5050965096945050505050565b60006112918261189d565b9050801561131a57600182015460098301546000916112bd91600160a01b900464ffffffffff1661199d565b83549091506112d390829063ffffffff611a1216565b8355600283015460098401546000916112f991600160a01b900464ffffffffff16611a4b565b9050611312846004015482611a1290919063ffffffff16565b600485015550505b50600901805464ffffffffff60a01b1916600160a01b4264ffffffffff1602179055565b60078401546040805163487b7e7960e11b815290516000926001600160a01b0316916390f6fcf2916004808301926020929190829003018186803b15801561138557600080fd5b505afa158015611399573d6000803e3d6000fd5b505050506040513d60208110156113af57600080fd5b50516006860154604080516370a0823160e01b81526001600160a01b0392831660048201529051929350600092918716916370a0823191602480820192602092909190829003018186803b15801561140657600080fd5b505afa15801561141a573d6000803e3d6000fd5b505050506040513d602081101561143057600080fd5b50516009870154909150600090819081906001600160a01b03166357e37af08961147089611464898d63ffffffff610f6c16565b9063ffffffff61168516565b8c60070160009054906101000a90046001600160a01b03166001600160a01b03166318160ddd6040518163ffffffff1660e01b815260040160206040518083038186803b1580156114c057600080fd5b505afa1580156114d4573d6000803e3d6000fd5b505050506040513d60208110156114ea57600080fd5b505160088e0154604080516318160ddd60e01b815290516001600160a01b03909216916318160ddd91600480820192602092909190829003018186803b15801561153357600080fd5b505afa158015611547573d6000803e3d6000fd5b505050506040513d602081101561155d57600080fd5b5051604080516001600160e01b031960e088901b1681526001600160a01b039095166004860152602485019390935260448401919091526064830152608482018990525160a4808301926060929190829003018186803b1580156115c057600080fd5b505afa1580156115d4573d6000803e3d6000fd5b505050506040513d60608110156115ea57600080fd5b50805160208083015160409384015160018e0184905560038e0182905560028e018190558d5460048f015486518681529485018490528487018c905260608501839052608085019190915260a0840152935192965094509192506001600160a01b038a16917f131cf1f61e39fd78f61f07d78533f5b6c13629c80ef6965983e92c72efbaa4a4919081900360c00190a2505050505050505050565b6000610fc683836040518060400160405280601e81526020017f536166654d6174683a207375627472616374696f6e206f766572666c6f770000815250611b61565b604080516001600160a01b0380861660248301528416604482015260648082018490528251808303909101815260849091019091526020810180516001600160e01b03166323b872dd60e01b179052611721908590611bf8565b50505050565b511590565b9051600360029092021c16151590565b54670fffffffffff000019811691601082901c650fffffff0001600160f01b031691602081901c630fff0001600160e01b03169160309190911c610f01600160d01b031690565b60008261179257506000610e63565b8282028284828161179f57fe5b0414610fc65760405162461bcd60e51b81526004018080602001828103825260218152602001806120a46021913960400191505060405180910390fd5b6000610fc683836040518060400160405280601a81526020017f536166654d6174683a206469766973696f6e206279207a65726f000000000000815250611cae565b9051600160029092021c16151590565b60008261183e5750600019610fc6565b61185e83611852868563ffffffff610fcd16565b9063ffffffff611d1316565b949350505050565b5460301c610f01600160d01b031690565b60006002820461185e83610b7461189087612710611783565b849063ffffffff610f6c16565b6000610e638260080160009054906101000a90046001600160a01b03166001600160a01b03166318160ddd6040518163ffffffff1660e01b815260040160206040518083038186803b1580156118f257600080fd5b505afa158015611906573d6000803e3d6000fd5b505050506040513d602081101561191c57600080fd5b50516007840154604080516318160ddd60e01b815290516001600160a01b03909216916318160ddd91600480820192602092909190829003018186803b15801561196557600080fd5b505afa158015611979573d6000803e3d6000fd5b505050506040513d602081101561198f57600080fd5b50519063ffffffff610f6c16565b6000806119b74264ffffffffff851663ffffffff61168516565b905060006119e06119cb6301e13380611d32565b6119d484611d32565b9063ffffffff611d4816565b9050611a096119ed611d6b565b6119fd878463ffffffff611a1216565b9063ffffffff610f6c16565b95945050505050565b6000610fc66b033b2e3c9fd0803ce8000000610b74611a37868663ffffffff61178316565b60026b033b2e3c9fd0803ce8000000610fee565b600080611a654264ffffffffff851663ffffffff61168516565b905080611a7c57611a74611d6b565b915050610e63565b6000611a8f82600163ffffffff61168516565b9050600060028311611aa2576000611ab3565b611ab383600263ffffffff61168516565b90506000611acb876301e1338063ffffffff6117dc16565b90506000611adf828063ffffffff611a1216565b90506000611af3828463ffffffff611a1216565b90506000611b106002610b74856111f38b8b63ffffffff61178316565b90506000611b2f6006610b74856111f38a818e8e63ffffffff61178316565b9050611b52816119fd8481611b4a8a8e63ffffffff61178316565b6119fd611d6b565b9b9a5050505050505050505050565b60008184841115611bf05760405162461bcd60e51b81526004018080602001828103825283818151815260200191508051906020019080838360005b83811015611bb5578181015183820152602001611b9d565b50505050905090810190601f168015611be25780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b505050900390565b6060611c4d826040518060400160405280602081526020017f5361666545524332303a206c6f772d6c6576656c2063616c6c206661696c6564815250856001600160a01b0316611d7b9092919063ffffffff16565b805190915015611ca957808060200190516020811015611c6c57600080fd5b5051611ca95760405162461bcd60e51b815260040180806020018281038252602a815260200180612122602a913960400191505060405180910390fd5b505050565b60008183611cfd5760405162461bcd60e51b8152602060048201818152835160248401528351909283926044909101919085019080838360008315611bb5578181015183820152602001611b9d565b506000838581611d0957fe5b0495945050505050565b60006002820461185e83610b7461189087670de0b6b3a7640000611783565b6000610e6382633b9aca0063ffffffff61178316565b60006002820461185e83610b74611890876b033b2e3c9fd0803ce8000000611783565b6b033b2e3c9fd0803ce800000090565b606061185e84846000856060611d9085611ef2565b611de1576040805162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e7472616374000000604482015290519081900360640190fd5b60006060866001600160a01b031685876040518082805190602001908083835b60208310611e205780518252601f199092019160209182019101611e01565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038185875af1925050503d8060008114611e82576040519150601f19603f3d011682016040523d82523d6000602084013e611e87565b606091505b50915091508115611e9b57915061185e9050565b805115611eab5780518082602001fd5b60405162461bcd60e51b8152602060048201818152865160248401528651879391928392604401919085019080838360008315611bb5578181015183820152602001611b9d565b6000813f7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a47081811480159061185e575050151592915050565b6040518061022001604052806000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160006002811115611f8a57fe5b81526020016000815260200160008152602001600081526020016000815260200160006001600160a01b031681526020016000151581525090565b60405180610260016040528060008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152602001600081526020016000815260200160001515815260200160006001600160a01b031681526020016000151581526020016000151581525090565b6040518060e0016040528060008152602001600081526020016000815260200160008152602001600081526020016000815260200160008152509056fe536166654d6174683a206d756c7469706c69636174696f6e206f766572666c6f7754686572652069736e277420656e6f756768206c697175696469747920617661696c61626c6520746f206c697175696461746554686520636f6c6c61746572616c2063686f73656e2063616e6e6f74206265206c6971756964617465645361666545524332303a204552433230206f7065726174696f6e20646964206e6f7420737563636565644865616c746820666163746f72206973206e6f742062656c6f7720746865207468726573686f6c645573657220646964206e6f7420626f72726f7720746865207370656369666965642063757272656e6379a26469706673582212202f4250b43c9c15750c43513ac687cc5e003bd4a1e62e660ca6d008320b336ce764736f6c63430006080033";