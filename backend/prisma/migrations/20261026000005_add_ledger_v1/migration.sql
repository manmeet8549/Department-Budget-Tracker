-- CreateTable
CREATE TABLE "ledger_blocks" (
    "id" SERIAL NOT NULL,
    "block_no" INTEGER NOT NULL,
    "prev_block_hash" TEXT NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "block_hash" TEXT NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chain_id" INTEGER,
    "contract_address" TEXT,
    "tx_hash" TEXT,
    "chain_block_number" BIGINT,
    "error_message" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "anchored_at" TIMESTAMP(3),

    CONSTRAINT "ledger_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_block_entries" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "audit_entry_id" INTEGER NOT NULL,
    "leaf_hash" TEXT NOT NULL,

    CONSTRAINT "ledger_block_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_verifications" (
    "id" SERIAL NOT NULL,
    "run_by" INTEGER,
    "ok" BOOLEAN NOT NULL,
    "summary" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_blocks_block_no_key" ON "ledger_blocks"("block_no");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_block_entries_audit_entry_id_key" ON "ledger_block_entries"("audit_entry_id");

-- CreateIndex
CREATE INDEX "ledger_block_entries_block_id_position_idx" ON "ledger_block_entries"("block_id", "position");

-- AddForeignKey
ALTER TABLE "ledger_blocks" ADD CONSTRAINT "ledger_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_block_entries" ADD CONSTRAINT "ledger_block_entries_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "ledger_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_block_entries" ADD CONSTRAINT "ledger_block_entries_audit_entry_id_fkey" FOREIGN KEY ("audit_entry_id") REFERENCES "audit_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_verifications" ADD CONSTRAINT "ledger_verifications_run_by_fkey" FOREIGN KEY ("run_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

