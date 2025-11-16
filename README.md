# Indian Education Loan Calculator

A comprehensive Next.js application for calculating education loan EMI with moratorium period support.

## Features

- **Moratorium Period Support**: Calculate interest accrual during course duration
- **Detailed Amortization Schedule**: Month-by-month breakdown of payments
- **Disposable Income Analysis**: Calculate actual repayment time based on salary and expenses
- **Excel Export**: Download complete amortization schedule as .xlsx file
- **Responsive Design**: Modern UI built with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Enter Loan Details**:
   - Loan Amount (₹)
   - Annual Interest Rate (%)
   - Loan Tenure (Years)
   - Moratorium Period (Years) - your course duration

2. **Enter Financial Information**:
   - Expected Post-Graduation Annual Salary (₹)
   - Estimated Monthly Expenses (₹)

3. Click **Calculate Loan** to see:
   - Effective Principal (after moratorium interest)
   - Standard EMI
   - Monthly Disposable Income
   - Actual Repayment Time
   - Complete Amortization Schedule

4. Click **Download Schedule as Excel** to export the amortization table.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Excel Export**: SheetJS (xlsx)

## Build for Production

```bash
npm run build
npm start
```

## License

MIT
