const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EIP7849 Basic Tests", function () {
    let ISFT;
    let isft;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    const NAME = "Interoperable Secure Fungible Token Standard";
    const SYMBOL = "ISFT";
    const DECIMALS = 18;
    const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);

    beforeEach(async function () {
        // Get signers
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // Deploy contract
        ISFT = await ethers.getContractFactory("EIP7849");
        isft = await ISFT.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
    });

    describe("Deployment", function () {
        it("Should set the right owner balance", async function () {
            expect(await isft.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
        });

        it("Should set the correct token metadata", async function () {
            expect(await isft.name()).to.equal(NAME);
            expect(await isft.symbol()).to.equal(SYMBOL);
            expect(await isft.decimals()).to.equal(DECIMALS);
            expect(await isft.totalSupply()).to.equal(INITIAL_SUPPLY);
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.parseUnits("100", 18);
            
            // Transfer from owner to addr1
            await isft.transfer(addr1.address, transferAmount);
            expect(await isft.balanceOf(addr1.address)).to.equal(transferAmount);

            // Transfer from addr1 to addr2
            await isft.connect(addr1).transfer(addr2.address, transferAmount);
            expect(await isft.balanceOf(addr2.address)).to.equal(transferAmount);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await isft.balanceOf(owner.address);
            await expect(
                isft.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWithCustomError(isft, "InsufficientBalance");

            expect(await isft.balanceOf(owner.address)).to.equal(initialOwnerBalance);
        });

        it("Should fail if transferring to zero address", async function () {
            await expect(
                isft.transfer(ethers.ZeroAddress, 100)
            ).to.be.revertedWithCustomError(isft, "TransferToZeroAddress");
        });
    });

    describe("Allowances", function () {
        it("Should update allowances correctly", async function () {
            const allowanceAmount = ethers.parseUnits("100", 18);
            await isft.approve(addr1.address, allowanceAmount);
            expect(await isft.allowance(owner.address, addr1.address)).to.equal(allowanceAmount);
        });

        it("Should not approve zero address", async function () {
            await expect(
                isft.approve(ethers.ZeroAddress, 100)
            ).to.be.revertedWithCustomError(isft, "ApproveToZeroAddress");
        });

        it("Should allow transferFrom with sufficient allowance", async function () {
            const transferAmount = ethers.parseUnits("100", 18);
            
            // Fund contract for gas rebates
            await owner.sendTransaction({
                to: await isft.getAddress(),
                value: ethers.parseEther("1.0")
            });
            
            await isft.approve(addr1.address, transferAmount);
            await isft.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
            
            expect(await isft.balanceOf(addr2.address)).to.equal(transferAmount);
            expect(await isft.allowance(owner.address, addr1.address)).to.equal(0);
        });
    });

    describe("Permit", function () {
        it("Should execute permit function", async function () {
            const value = ethers.parseUnits("100", 18);
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            
            // Get current nonce from contract events or start from 0
            const nonce = 0n; // First permit will use nonce 0
            
            const domain = {
                name: NAME,
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await isft.getAddress()
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };

            const message = {
                owner: owner.address,
                spender: addr1.address,
                value: value,
                nonce: nonce,
                deadline: deadline
            };

            const signature = await owner.signTypedData(domain, types, message);
            const sig = ethers.Signature.from(signature);

            await isft.permit(
                owner.address,
                addr1.address,
                value,
                deadline,
                sig.v,
                sig.r,
                sig.s
            );

            expect(await isft.allowance(owner.address, addr1.address)).to.equal(value);
        });

        it("Should reject expired permit", async function () {
            const deadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
            await expect(
                isft.permit(
                    owner.address,
                    addr1.address,
                    100,
                    deadline,
                    0,
                    ethers.ZeroHash,
                    ethers.ZeroHash
                )
            ).to.be.revertedWithCustomError(isft, "ExpiredDeadline");
        });
    });

    describe("Gas Rebate", function () {
        it("Should process gas rebate for first transaction", async function () {
            await owner.sendTransaction({
                to: isft.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const tx = await isft.transfer(addr1.address, 100);
            const receipt = await tx.wait();
            
            const rebateEvent = receipt.logs.find(
                log => log.fragment && log.fragment.name === 'GasRebate'
            );
            
            expect(rebateEvent).to.not.be.undefined;
        });
    });
});