export function numberToWords(num) {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertLessThanThousand(n % 100) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = '';
  if (rupees > 0) {
    let remaining = rupees;
    const crore = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    const lakh = Math.floor(remaining / 100000);
    remaining %= 100000;
    const thousand = Math.floor(remaining / 1000);
    remaining %= 1000;

    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remaining > 0) result += convertLessThanThousand(remaining);

    result = result.trim() + ' Rupees';
  }

  if (paise > 0) {
    result += (result ? ' and ' : '') + convertLessThanThousand(paise) + ' Paise';
  }

  return result + ' Only';
}

export function round2(num) {
  return Math.round(num * 100) / 100;
}

export function generateInvoiceNumber(invoices) {
  const currentYear = new Date().getFullYear();
  const financialYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const fy = `${financialYear}-${(financialYear + 1).toString().slice(2)}`;
  const prefix = `INV/${fy}/`;

  let maxNum = 0;
  for (const inv of invoices) {
    if (inv.invoice_number && inv.invoice_number.startsWith(prefix)) {
      const parts = inv.invoice_number.split('/');
      const num = parseInt(parts[2], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

export function generateCreditNoteNumber(creditNotes) {
  const currentYear = new Date().getFullYear();
  const financialYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const fy = `${financialYear}-${(financialYear + 1).toString().slice(2)}`;
  const prefix = `CN/${fy}/`;

  let maxNum = 0;
  for (const cn of creditNotes) {
    if (cn.credit_note_number && cn.credit_note_number.startsWith(prefix)) {
      const parts = cn.credit_note_number.split('/');
      const num = parseInt(parts[2], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

export function nowISO() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
