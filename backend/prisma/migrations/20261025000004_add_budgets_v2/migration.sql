-- AlterTable
ALTER TABLE "budgets" ADD COLUMN "submitted_by" INTEGER,
ADD COLUMN "submitted_on" TIMESTAMP(3),
ADD COLUMN "reviewed_by" INTEGER,
ADD COLUMN "reviewed_on" TIMESTAMP(3),
ADD COLUMN "rejected_by" INTEGER,
ADD COLUMN "rejected_on" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "college_ceilings" (
    "id" SERIAL NOT NULL,
    "financial_year_id" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "set_by" INTEGER NOT NULL,
    "set_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "college_ceilings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "college_ceilings_financial_year_id_key" ON "college_ceilings"("financial_year_id");

-- AddForeignKey
ALTER TABLE "college_ceilings" ADD CONSTRAINT "college_ceilings_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "college_ceilings" ADD CONSTRAINT "college_ceilings_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
