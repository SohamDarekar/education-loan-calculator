"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

interface AmortizationRow {
  month: number;
  openingBalance: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
}

export default function LoanCalculatorPage() {
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(10.5);
  const [loanTenure, setLoanTenure] = useState<number>(10);
  const [courseDuration, setCourseDuration] = useState<number>(4);
  const [restingPeriod, setRestingPeriod] = useState<number>(0);
  const [annualSalary, setAnnualSalary] = useState<number>(600000);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(15000);

  const [amortizationSchedule, setAmortizationSchedule] = useState<
    AmortizationRow[]
  >([]);
  const [standardEMI, setStandardEMI] = useState<number>(0);
  const [actualRepaymentTime, setActualRepaymentTime] = useState<number>(0);
  const [effectivePrincipal, setEffectivePrincipal] = useState<number>(0);

  const calculateLoan = () => {
    console.log("Calculate button clicked!");
    console.log({ loanAmount, interestRate, loanTenure, courseDuration, restingPeriod, annualSalary, monthlyExpenses });
    
    // Step 1: Calculate total period (course duration + resting period in years)
    const totalPeriod = courseDuration + (restingPeriod / 12);
    
    // Step 2: Calculate simple interest during the total period
    const simpleInterest =
      (loanAmount * interestRate * totalPeriod) / 100;

    // Step 3: Calculate effective principal
    const newPrincipal = loanAmount + simpleInterest;
    setEffectivePrincipal(newPrincipal);

    // Step 4: Calculate standard EMI using effective principal
    const monthlyRate = interestRate / 12 / 100;
    const numberOfMonths = loanTenure * 12;

    let emi: number;
    if (monthlyRate === 0) {
      emi = newPrincipal / numberOfMonths;
    } else {
      emi =
        (newPrincipal *
          monthlyRate *
          Math.pow(1 + monthlyRate, numberOfMonths)) /
        (Math.pow(1 + monthlyRate, numberOfMonths) - 1);
    }
    setStandardEMI(emi);

    // Step 5: Calculate monthly disposable income
    const monthlyDisposableIncome = annualSalary / 12 - monthlyExpenses;

    // Step 6: Generate amortization schedule
    const schedule: AmortizationRow[] = [];
    let balance = newPrincipal;
    let month = 1;

    while (balance > 0.01) {
      const interestForMonth = balance * monthlyRate;
      const principalForMonth = Math.min(emi - interestForMonth, balance);
      const actualEMI = interestForMonth + principalForMonth;
      const newBalance = balance - principalForMonth;

      schedule.push({
        month,
        openingBalance: balance,
        emi: actualEMI,
        principalPaid: principalForMonth,
        interestPaid: interestForMonth,
        closingBalance: Math.max(newBalance, 0),
      });

      balance = newBalance;
      month++;

      // Safety break to prevent infinite loops
      if (month > 1000) break;
    }

    setAmortizationSchedule(schedule);

    // Step 7: Calculate actual repayment time based on disposable income
    let actualBalance = newPrincipal;
    let actualMonths = 0;

    if (monthlyDisposableIncome > 0) {
      while (actualBalance > 0.01) {
        const interestForMonth = actualBalance * monthlyRate;
        const principalForMonth = Math.min(
          monthlyDisposableIncome - interestForMonth,
          actualBalance
        );

        if (principalForMonth <= 0) {
          // Cannot afford to pay even the interest
          setActualRepaymentTime(-1);
          return;
        }

        actualBalance -= principalForMonth;
        actualMonths++;

        // Safety break
        if (actualMonths > 1000) break;
      }

      setActualRepaymentTime(actualMonths / 12);
    } else {
      setActualRepaymentTime(-1);
    }
  };

  const downloadExcel = () => {
    if (amortizationSchedule.length === 0) {
      alert("Please calculate the loan first!");
      return;
    }

    // Format data for Excel
    const excelData = amortizationSchedule.map((row) => ({
      Month: row.month,
      "Opening Balance (₹)": row.openingBalance.toFixed(2),
      "EMI (₹)": row.emi.toFixed(2),
      "Principal Paid (₹)": row.principalPaid.toFixed(2),
      "Interest Paid (₹)": row.interestPaid.toFixed(2),
      "Closing Balance (₹)": row.closingBalance.toFixed(2),
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Amortization Schedule");

    // Download file
    XLSX.writeFile(workbook, "education_loan_amortization_schedule.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Indian Education Loan Calculator
          </h1>
          <p className="text-gray-600">
            Calculate your education loan EMI with course duration and resting period
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Loan Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="1000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="10.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Tenure (Years)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={loanTenure}
                  onChange={(e) => setLoanTenure(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Duration (Years)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="4"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Duration of your course
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resting Period (Months)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={restingPeriod}
                  onChange={(e) => setRestingPeriod(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional months before EMI payments begin
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Post-Graduation Annual Salary (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={annualSalary}
                  onChange={(e) => setAnnualSalary(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="600000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Monthly Expenses (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="15000"
                />
              </div>

              <button
                onClick={calculateLoan}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200 shadow-md"
              >
                Calculate Loan
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Results
            </h2>

            {standardEMI > 0 ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-sm text-gray-600 mb-1">
                    Effective Principal (After {(courseDuration + restingPeriod / 12).toFixed(2)} years)
                  </p>
                  <p className="text-2xl font-bold text-indigo-700">
                    ₹{effectivePrincipal.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Standard EMI</p>
                  <p className="text-2xl font-bold text-green-700">
                    ₹{standardEMI.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {loanTenure} years tenure
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">
                    Monthly Disposable Income
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    ₹
                    {(annualSalary / 12 - monthlyExpenses).toLocaleString(
                      "en-IN",
                      { maximumFractionDigits: 2 }
                    )}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">
                    Actual Repayment Time
                  </p>
                  {actualRepaymentTime > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-orange-700">
                        {actualRepaymentTime.toFixed(2)} years
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on disposable income
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-red-600">
                      Insufficient disposable income
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Total Months</p>
                  <p className="text-xl font-bold text-gray-700">
                    {amortizationSchedule.length} months
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-4 text-gray-500">
                  Enter loan details and click "Calculate Loan" to see results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Amortization Schedule Table */}
        {amortizationSchedule.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Amortization Schedule
              </h2>
              <button
                onClick={downloadExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 shadow-md flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Schedule as Excel (.xlsx)
              </button>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opening Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      EMI
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interest
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {amortizationSchedule.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        ₹
                        {row.openingBalance.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-semibold">
                        ₹
                        {row.emi.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right">
                        ₹
                        {row.principalPaid.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right">
                        ₹
                        {row.interestPaid.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        ₹
                        {row.closingBalance.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
