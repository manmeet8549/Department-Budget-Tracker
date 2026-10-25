-- CreateTable
CREATE TABLE "approvals" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "step_no" INTEGER NOT NULL DEFAULT 1,
    "approver_id" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "remark" TEXT,
    "decided_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approvals_entity_type_entity_id_idx" ON "approvals"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
