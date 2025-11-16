"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

interface AmortizationRow {
  month: number;
  openingBalance: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
}

const InfoTooltip: React.FC<{ explanation: React.ReactNode }> = ({ explanation }) => {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside as EventListener);
      document.addEventListener("touchstart", handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside as EventListener);
      document.removeEventListener("touchstart", handleClickOutside as EventListener);
    };
  }, [show]);

  return (
    <div ref={tooltipRef} className="relative inline-block ml-2">
      <svg
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-indigo-600 cursor-pointer flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      {show && (
        <div className="absolute z-10 bottom-full right-0 mb-2 w-64 sm:w-72 p-3 bg-gray-900 text-white text-xs sm:text-sm rounded-lg shadow-lg">
          <div className="absolute top-full right-4 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900"></div>
          {explanation}
        </div>
      )}
    </div>
  );
};

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
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 px-2">
            Indian Education Loan Calculator
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">
            Calculate your education loan EMI with course duration and resting period
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
              Loan Details
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Loan Amount (₹)</span>
                  <InfoTooltip explanation="The total amount of money you are borrowing from the bank for your education." />
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
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Annual Interest Rate (%)</span>
                  <InfoTooltip explanation="The yearly interest rate the bank charges on your loan. This is used to calculate the interest that builds up during your course." />
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
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Loan Tenure (Years)</span>
                  <InfoTooltip explanation="The *official* number of years the bank gives you to repay your loan. This period starts *after* your 'holiday' (course + resting) period is over." />
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
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Course Duration (Years)</span>
                  <InfoTooltip explanation="The length of your college course. During this 'moratorium' period, you don't make payments, but simple interest is calculated and added to your loan." />
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
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Resting Period (Months)</span>
                  <InfoTooltip explanation="The 'grace period' *after* your course ends but *before* your EMIs begin (usually 6-12 months). Interest *still* builds up during this time." />
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
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Estimated Post-Graduation Annual Salary (₹)</span>
                  <InfoTooltip explanation="Your expected yearly salary after taxes. This is used to calculate your 'Monthly Disposable Income' and estimate your *actual* repayment time." />
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
                <label className="flex items-start text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  <span className="flex-1">Estimated Monthly Expenses (₹)</span>
                  <InfoTooltip explanation="Your total monthly living costs (rent, food, travel, etc.). This is subtracted from your salary to see what you can *actually* afford to pay." />
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
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
              Results
            </h2>

            {standardEMI > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
                  <p className="flex items-start text-xs sm:text-sm text-gray-600 mb-1">
                    <span className="flex-1">Effective Principal (After {(courseDuration + restingPeriod / 12).toFixed(2)} years)</span>
                    <InfoTooltip explanation="This is your *real* starting loan amount. It's the **Original Loan Amount + all the interest** that built up during your (Course Duration + Resting Period). Your EMI is calculated on this new, larger amount." />
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-indigo-700 break-all">
                    ₹{effectivePrincipal.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <p className="flex items-start text-xs sm:text-sm text-gray-600 mb-1">
                    <span className="flex-1">Standard EMI</span>
                    <InfoTooltip explanation="Your 'Equated Monthly Installment' (EMI). This is the fixed amount you will pay the bank each month, based on your **Effective Principal** and **Loan Tenure**." />
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700 break-all">
                    ₹{standardEMI.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {loanTenure} years tenure
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                  <p className="flex items-start text-xs sm:text-sm text-gray-600 mb-1">
                    <span className="flex-1">Monthly Disposable Income</span>
                    <InfoTooltip explanation="Your (Monthly Salary - Monthly Expenses). This is the amount you *actually* have left over to pay your loan. If this is higher than your EMI, you can pay off your loan much faster!" />
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-700 break-all">
                    ₹
                    {(annualSalary / 12 - monthlyExpenses).toLocaleString(
                      "en-IN",
                      { maximumFractionDigits: 2 }
                    )}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                  <p className="flex items-start text-xs sm:text-sm text-gray-600 mb-1">
                    <span className="flex-1">Actual Repayment Time</span>
                    <InfoTooltip explanation="An estimate of how many years it will *actually* take to repay the loan if you pay your full 'Monthly Disposable Income' every month. This shows you how much faster you can be debt-free!" />
                  </p>
                  {actualRepaymentTime > 0 ? (
                    <>
                      <p className="text-xl sm:text-2xl font-bold text-orange-700">
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

                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Months</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-700">
                    {amortizationSchedule.length} months
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
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
                <p className="mt-4 text-sm sm:text-base text-gray-500 px-4">
                  Enter loan details and click "Calculate Loan" to see results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Amortization Schedule Table */}
        {amortizationSchedule.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
              <h2 className="flex items-start text-xl sm:text-2xl font-semibold text-gray-800">
                <span className="flex-1">Amortization Schedule</span>
                <InfoTooltip explanation={<>This table shows exactly where every rupee of your EMI goes. Your EMI is split into two parts: <strong>Interest</strong> (the bank's profit) and <strong>Principal</strong> (what pays down your actual loan).<br /><br />- At the start, most of your EMI pays for <strong>Interest</strong>.<br />- As your loan balance gets smaller, the <strong>Interest</strong> part decreases and the <strong>Principal</strong> part increases.<br />- The <strong>Closing Balance</strong> shows your remaining loan after each payment.</>} />
              </h2>
              <button
                onClick={downloadExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-md transition duration-200 shadow-md flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
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
                <span className="hidden sm:inline">Download Schedule as Excel (.xlsx)</span>
                <span className="sm:hidden">Download Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[70vh] sm:max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Opening Balance</span>
                      <span className="sm:hidden">Opening</span>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      EMI
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Principal</span>
                      <span className="sm:hidden">Prin.</span>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Interest</span>
                      <span className="sm:hidden">Int.</span>
                    </th>
                    <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Closing Balance</span>
                      <span className="sm:hidden">Closing</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {amortizationSchedule.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        {row.month}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 text-right">
                        ₹
                        {row.openingBalance.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 text-right font-semibold">
                        ₹
                        {row.emi.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-blue-600 text-right">
                        ₹
                        {row.principalPaid.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-orange-600 text-right">
                        ₹
                        {row.interestPaid.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 text-right">
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
