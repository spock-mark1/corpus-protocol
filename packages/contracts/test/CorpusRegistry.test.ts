import { expect } from "chai";
import { ethers } from "hardhat";
import { CorpusRegistry, MockHederaTokenService } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CorpusRegistry", () => {
  let registry: CorpusRegistry;
  let mockHTS: MockHederaTokenService;
  let creator: SignerWithAddress;
  let investor: SignerWithAddress;
  let treasury: SignerWithAddress;
  let protocolWallet: SignerWithAddress;
  let stranger: SignerWithAddress;

  const defaultPatron = () => ({
    creatorShare: 6000,
    investorShare: 2500,
    treasuryShare: 1500,
    creatorAddr: creator.address,
    investorAddr: investor.address,
    treasuryAddr: treasury.address,
  });

  const defaultKernel = () => ({
    approvalThreshold: 1000n, // $10
    gtmBudget: 20000n, // $200
    minPatronPulse: 1000n,
  });

  const defaultPulse = () => ({
    hederaTokenAddr: ethers.ZeroAddress, // filled by contract
    totalSupply: 1_000_000n,
    priceUsdCents: 1n, // $0.01
  });

  const createCorpus = (
    signer?: SignerWithAddress,
    overrides?: { name?: string; patron?: ReturnType<typeof defaultPatron>; pulse?: ReturnType<typeof defaultPulse> }
  ) => {
    const r = signer ? registry.connect(signer) : registry;
    return r.createCorpus(
      overrides?.name ?? "TestCorpus",
      "Marketing",
      overrides?.patron ?? defaultPatron(),
      defaultKernel(),
      overrides?.pulse ?? defaultPulse(),
      "Test Pulse",
      "TPLS",
      { value: ethers.parseEther("1") }
    );
  };

  beforeEach(async () => {
    [creator, investor, treasury, protocolWallet, stranger] = await ethers.getSigners();

    const MockHTS = await ethers.getContractFactory("MockHederaTokenService");
    mockHTS = await MockHTS.deploy();

    const Factory = await ethers.getContractFactory("CorpusRegistry");
    registry = await Factory.deploy(await mockHTS.getAddress(), protocolWallet.address);
  });

  // ── Creation ────────────────────────────────────────────────────

  describe("createCorpus", () => {
    it("creates a corpus, mints Pulse token, and emits events", async () => {
      const tx = await createCorpus();

      await expect(tx)
        .to.emit(registry, "CorpusCreated")
        .withArgs(1n, creator.address, "TestCorpus");

      await expect(tx).to.emit(registry, "PulseTokenCreated");

      const corpus = await registry.getCorpus(1n);
      expect(corpus.name).to.equal("TestCorpus");
      expect(corpus.category).to.equal("Marketing");
      expect(corpus.creator).to.equal(creator.address);
      expect(corpus.active).to.be.true;
      expect(corpus.patron.creatorShare).to.equal(6000);
      expect(corpus.kernel.approvalThreshold).to.equal(1000n);
      expect(corpus.pulse.totalSupply).to.equal(1_000_000n);
      // Token address should be set (not zero)
      expect(corpus.pulse.hederaTokenAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("distributes 3% to protocol wallet and 97% to creator", async () => {
      await createCorpus();

      const corpus = await registry.getCorpus(1n);
      const tokenAddr = corpus.pulse.hederaTokenAddr;
      const totalSupply = 1_000_000n;
      const expectedFee = (totalSupply * 300n) / 10000n; // 3% = 30,000
      const expectedCreator = totalSupply - expectedFee;  // 970,000

      const protocolBalance = await mockHTS.balanceOf(tokenAddr, protocolWallet.address);
      const creatorBalance = await mockHTS.balanceOf(tokenAddr, creator.address);

      expect(protocolBalance).to.equal(expectedFee);
      expect(creatorBalance).to.equal(expectedCreator);
    });

    it("increments corpus IDs", async () => {
      await createCorpus(undefined, { name: "A" });
      await createCorpus(undefined, { name: "B" });

      expect((await registry.getCorpus(1n)).name).to.equal("A");
      expect((await registry.getCorpus(2n)).name).to.equal("B");
      expect(await registry.nextCorpusId()).to.equal(3n);
    });

    it("reverts on empty name", async () => {
      await expect(
        registry.createCorpus(
          "", "Dev", defaultPatron(), defaultKernel(), defaultPulse(),
          "Token", "TKN", { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(registry, "EmptyName");
    });

    it("reverts on empty token name", async () => {
      await expect(
        registry.createCorpus(
          "X", "Dev", defaultPatron(), defaultKernel(), defaultPulse(),
          "", "TKN", { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(registry, "EmptyTokenName");
    });

    it("reverts if shares do not sum to 10000", async () => {
      const patron = { ...defaultPatron(), creatorShare: 5000 };
      await expect(
        createCorpus(undefined, { patron })
      ).to.be.revertedWithCustomError(registry, "InvalidShares");
    });

    it("reverts if addresses are zero", async () => {
      const patron = { ...defaultPatron(), investorAddr: ethers.ZeroAddress };
      await expect(
        createCorpus(undefined, { patron })
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("reverts if addresses are duplicate", async () => {
      const patron = { ...defaultPatron(), investorAddr: creator.address };
      await expect(
        createCorpus(undefined, { patron })
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });
  });

  // ── Updates ─────────────────────────────────────────────────────

  describe("updatePatron", () => {
    beforeEach(async () => { await createCorpus(); });

    it("creator can update patron config", async () => {
      const newPatron = { ...defaultPatron(), creatorShare: 5000, investorShare: 3000, treasuryShare: 2000 };
      await expect(registry.updatePatron(1n, newPatron))
        .to.emit(registry, "PatronUpdated")
        .withArgs(1n);

      const corpus = await registry.getCorpus(1n);
      expect(corpus.patron.creatorShare).to.equal(5000);
    });

    it("stranger cannot update patron", async () => {
      await expect(
        registry.connect(stranger).updatePatron(1n, defaultPatron())
      ).to.be.revertedWithCustomError(registry, "NotCreator");
    });

    it("reverts on invalid shares", async () => {
      const bad = { ...defaultPatron(), creatorShare: 9999 };
      await expect(
        registry.updatePatron(1n, bad)
      ).to.be.revertedWithCustomError(registry, "InvalidShares");
    });
  });

  describe("updateKernel", () => {
    beforeEach(async () => { await createCorpus(); });

    it("creator can update kernel", async () => {
      const newKernel = { approvalThreshold: 5000n, gtmBudget: 50000n, minPatronPulse: 500n };
      await expect(registry.updateKernel(1n, newKernel))
        .to.emit(registry, "KernelUpdated")
        .withArgs(1n);

      const corpus = await registry.getCorpus(1n);
      expect(corpus.kernel.approvalThreshold).to.equal(5000n);
      expect(corpus.kernel.gtmBudget).to.equal(50000n);
    });

    it("stranger cannot update kernel", async () => {
      await expect(
        registry.connect(stranger).updateKernel(1n, defaultKernel())
      ).to.be.revertedWithCustomError(registry, "NotCreator");
    });
  });

  describe("updatePulse", () => {
    beforeEach(async () => { await createCorpus(); });

    it("creator can update pulse", async () => {
      const newPulse = { hederaTokenAddr: investor.address, totalSupply: 2_000_000n, priceUsdCents: 5n };
      await expect(registry.updatePulse(1n, newPulse))
        .to.emit(registry, "PulseUpdated")
        .withArgs(1n);

      const corpus = await registry.getCorpus(1n);
      expect(corpus.pulse.priceUsdCents).to.equal(5n);
    });

    it("stranger cannot update pulse", async () => {
      await expect(
        registry.connect(stranger).updatePulse(1n, defaultPulse())
      ).to.be.revertedWithCustomError(registry, "NotCreator");
    });
  });

  // ── Deactivation ────────────────────────────────────────────────

  describe("deactivateCorpus", () => {
    beforeEach(async () => { await createCorpus(); });

    it("creator can deactivate", async () => {
      await expect(registry.deactivateCorpus(1n))
        .to.emit(registry, "CorpusDeactivated")
        .withArgs(1n);
      expect(await registry.isActive(1n)).to.be.false;
    });

    it("cannot update after deactivation", async () => {
      await registry.deactivateCorpus(1n);
      await expect(
        registry.updateKernel(1n, defaultKernel())
      ).to.be.revertedWithCustomError(registry, "CorpusInactive");
    });

    it("stranger cannot deactivate", async () => {
      await expect(
        registry.connect(stranger).deactivateCorpus(1n)
      ).to.be.revertedWithCustomError(registry, "NotCreator");
    });
  });

  // ── Read ────────────────────────────────────────────────────────

  describe("read functions", () => {
    it("reverts getCorpus on nonexistent ID", async () => {
      await expect(registry.getCorpus(999n))
        .to.be.revertedWithCustomError(registry, "CorpusNotFound");
    });

    it("creatorOf returns address(0) for nonexistent", async () => {
      expect(await registry.creatorOf(999n)).to.equal(ethers.ZeroAddress);
    });
  });
});
