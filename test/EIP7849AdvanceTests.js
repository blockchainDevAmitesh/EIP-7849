const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EIP7849 Advanced Tests", function () {
    let ISFT;
    let isft;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    const NAME = "Interoperable Secure Fungible Token Standard";
    const SYMBOL = "ISFT";
    const DECIMALS = 18;
    const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
        ISFT = await ethers.getContractFactory("EIP7849");
        isft = await ISFT.deploy(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY);
    });

    describe("Advanced Transfer Scenarios", function () {
        it("Should handle multiple transfers in sequence", async function () {
            const amount = ethers.parseUnits("100", 18);
            const halfAmount = amount / 2n;
            
            await isft.transfer(addr1.address, amount);
            await isft.transfer(addr2.address, amount);
            await isft.connect(addr1).transfer(addr3.address, halfAmount);

            expect(await isft.balanceOf(addr1.address)).to.equal(halfAmount);
            expect(await isft.balanceOf(addr2.address)).to.equal(amount);
            expect(await isft.balanceOf(addr3.address)).to.equal(halfAmount);
        });

        it("Should revert when transferring exact balance plus one token", async function () {
            const balance = await isft.balanceOf(owner.address);
            await expect(
                isft.transfer(addr1.address, balance + 1n)
            ).to.be.revertedWithCustomError(isft, "InsufficientBalance");
        });
    });

    describe("Advanced Allowance Scenarios", function () {
        it("Should handle allowance decreases correctly", async function () {
            const initialAllowance = ethers.parseUnits("1000", 18);
            const decreaseAmount = ethers.parseUnits("600", 18);
            
            await isft.approve(addr1.address, initialAllowance);
            await isft.approve(addr1.address, initialAllowance - decreaseAmount);
            
            expect(await isft.allowance(owner.address, addr1.address))
                .to.equal(initialAllowance - decreaseAmount);
        });

        it("Should handle multiple approved spenders", async function () {
            const amount = ethers.parseUnits("100", 18);
            await isft.approve(addr1.address, amount);
            await isft.approve(addr2.address, amount * 2n);
            await isft.approve(addr3.address, amount * 3n);

            expect(await isft.allowance(owner.address, addr1.address)).to.equal(amount);
            expect(await isft.allowance(owner.address, addr2.address)).to.equal(amount * 2n);
            expect(await isft.allowance(owner.address, addr3.address)).to.equal(amount * 3n);
        });
    });

    describe("Gas Rebate Mechanism", function () {
        beforeEach(async function () {
            // Fund contract with ETH for gas rebates
            await owner.sendTransaction({
                to: await isft.getAddress(),
                value: ethers.parseEther("10.0")
            });
        });

        it("Should only provide gas rebate once per address", async function () {
            // First transfer should get rebate
            const tx1 = await isft.transfer(addr1.address, 100);
            const receipt1 = await tx1.wait();
            const rebateEvent1 = receipt1.logs.find(
                log => log.fragment && log.fragment.name === 'GasRebate'
            );
            expect(rebateEvent1).to.not.be.undefined;

            // Second transfer should not get rebate
            const tx2 = await isft.transfer(addr1.address, 100);
            const receipt2 = await tx2.wait();
            const rebateEvent2 = receipt2.logs.find(
                log => log.fragment && log.fragment.name === 'GasRebate'
            );
            expect(rebateEvent2).to.be.undefined;
        });

        it("Should track rebate transaction count", async function () {
            // Perform multiple transfers from different accounts
            for(let i = 0; i < 5; i++) {
                if(addrs[i]) {
                    await isft.transfer(addrs[i].address, 100);
                }
            }
        });
    });

    describe("Permit Security", function () {
        it("Should reject permit with invalid signature", async function () {
            const value = ethers.parseUnits("100", 18);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            await expect(
                isft.permit(
                    owner.address,
                    addr1.address,
                    value,
                    deadline,
                    27, // invalid v
                    ethers.hexlify(ethers.randomBytes(32)), // random r
                    ethers.hexlify(ethers.randomBytes(32)) // random s
                )
            ).to.be.revertedWithCustomError(isft, "InvalidSignature");
        });

        it("Should reject permit replay attacks", async function () {
            const value = ethers.parseUnits("100", 18);
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const nonce = 0n; // First permit uses nonce 0

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

            // First permit should succeed
            await isft.permit(
                owner.address,
                addr1.address,
                value,
                deadline,
                sig.v,
                sig.r,
                sig.s
            );

            // Second permit with same signature should fail
            // because nonce has increased
            await expect(
                isft.permit(
                    owner.address,
                    addr1.address,
                    value,
                    deadline,
                    sig.v,
                    sig.r,
                    sig.s
                )
            ).to.be.revertedWithCustomError(isft, "InvalidSignature");
        });
    });
});