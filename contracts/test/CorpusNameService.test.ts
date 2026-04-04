import { expect } from "chai";
import { ethers } from "hardhat";
import { CorpusRegistry, CorpusNameService } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CorpusNameService", () => {
  let registry: CorpusRegistry;
  let nameService: CorpusNameService;
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
    approvalThreshold: 1000n,
    gtmBudget: 20000n,
    minPatronPulse: 1000n,
  });

  const defaultPulse = () => ({
    hederaTokenAddr: ethers.ZeroAddress,
    totalSupply: 1_000_000n,
    priceUsdCents: 1n,
  });

  const createCorpus = (name = "TestCorpus") =>
    registry.createCorpus(
      name, "Marketing", defaultPatron(), defaultKernel(), defaultPulse(),
      "Test Pulse", "TPLS",
      { value: ethers.parseEther("1") }
    );

  beforeEach(async () => {
    [creator, investor, treasury, protocolWallet, stranger] = await ethers.getSigners();

    const MockHTS = await ethers.getContractFactory("MockHederaTokenService");
    const mockHTS = await MockHTS.deploy();

    const RegistryFactory = await ethers.getContractFactory("CorpusRegistry");
    registry = await RegistryFactory.deploy(await mockHTS.getAddress(), protocolWallet.address);

    const NameFactory = await ethers.getContractFactory("CorpusNameService");
    nameService = await NameFactory.deploy(await registry.getAddress());

    // Create a corpus for testing
    await createCorpus();
  });

  // ── Registration ────────────────────────────────────────────────

  describe("registerName", () => {
    it("registers a name and emits event", async () => {
      await expect(nameService.registerName(1n, "marketbot"))
        .to.emit(nameService, "NameRegistered")
        .withArgs(1n, "marketbot");

      expect(await nameService.nameOf(1n)).to.equal("marketbot");
      expect(await nameService.resolveName("marketbot")).to.equal(1n);
      expect(await nameService.hasName(1n)).to.be.true;
    });

    it("rejects second registration for same corpus", async () => {
      await nameService.registerName(1n, "marketbot");
      await expect(
        nameService.registerName(1n, "otherbot")
      ).to.be.revertedWithCustomError(nameService, "NameAlreadySet");
    });

    it("rejects duplicate name on different corpus", async () => {
      await nameService.registerName(1n, "marketbot");

      // Create second corpus
      await createCorpus("Second");
      await expect(
        nameService.registerName(2n, "marketbot")
      ).to.be.revertedWithCustomError(nameService, "NameTaken");
    });

    it("rejects non-creator", async () => {
      await expect(
        nameService.connect(stranger).registerName(1n, "marketbot")
      ).to.be.revertedWithCustomError(nameService, "NotCorpusCreator");
    });

    it("rejects nonexistent corpus", async () => {
      await expect(
        nameService.registerName(999n, "ghost")
      ).to.be.revertedWithCustomError(nameService, "CorpusNotFound");
    });
  });

  // ── Name Validation ─────────────────────────────────────────────

  describe("name validation", () => {
    it("accepts valid names", async () => {
      expect(await nameService.isNameAvailable("abc")).to.be.true;
      expect(await nameService.isNameAvailable("market-bot")).to.be.true;
      expect(await nameService.isNameAvailable("agent007")).to.be.true;
      expect(await nameService.isNameAvailable("my-cool-agent-name")).to.be.true;
    });

    it("rejects too short (< 3 chars)", async () => {
      await expect(
        nameService.registerName(1n, "ab")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
      expect(await nameService.isNameAvailable("ab")).to.be.false;
    });

    it("rejects too long (> 32 chars)", async () => {
      const longName = "a".repeat(33);
      await expect(
        nameService.registerName(1n, longName)
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });

    it("rejects uppercase", async () => {
      await expect(
        nameService.registerName(1n, "MarketBot")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });

    it("rejects spaces", async () => {
      await expect(
        nameService.registerName(1n, "market bot")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });

    it("rejects leading hyphen", async () => {
      await expect(
        nameService.registerName(1n, "-marketbot")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });

    it("rejects trailing hyphen", async () => {
      await expect(
        nameService.registerName(1n, "marketbot-")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });

    it("rejects consecutive hyphens", async () => {
      await expect(
        nameService.registerName(1n, "market--bot")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });

    it("rejects special characters", async () => {
      await expect(
        nameService.registerName(1n, "market_bot")
      ).to.be.revertedWithCustomError(nameService, "InvalidName");
    });
  });

  // ── Read ────────────────────────────────────────────────────────

  describe("read functions", () => {
    it("resolveName returns 0 for unknown name", async () => {
      expect(await nameService.resolveName("unknown")).to.equal(0n);
    });

    it("nameOf returns empty for corpus without name", async () => {
      expect(await nameService.nameOf(1n)).to.equal("");
    });

    it("hasName returns false for corpus without name", async () => {
      expect(await nameService.hasName(1n)).to.be.false;
    });

    it("isNameAvailable returns false for taken names", async () => {
      await nameService.registerName(1n, "taken");
      expect(await nameService.isNameAvailable("taken")).to.be.false;
    });
  });
});
