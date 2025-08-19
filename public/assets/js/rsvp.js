// RSVP form submission handler.
//
// When the RSVP form is submitted, this script gathers values from the
// form fields, constructs a JSON payload, and sends it via POST to
// the server's `/rsvp` endpoint.  Feedback is displayed to the user
// depending on the success or failure of the request.

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rsvpForm');
  const responseEl = document.getElementById('rsvpResponse');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Collect form data into an object.  Trim whitespace on strings.
    const formData = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      guests: parseInt(form.guests.value, 10) || 0,
      attending: form.attending.value,
      message: form.message.value.trim(),
    };

    try {
      const res = await fetch('https://wedding-site-nccr.onrender.com/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (res.ok) {
        responseEl.style.color = 'green';
        responseEl.textContent = result.message || 'RSVP submitted successfully.';
        form.reset();
      } else {
        responseEl.style.color = 'red';
        responseEl.textContent = result.error || 'There was a problem submitting your RSVP.';
      }
    } catch (err) {
      responseEl.style.color = 'red';
      responseEl.textContent = 'An unexpected error occurred. Please try again later.';
    }
    responseEl.style.display = 'block';
  });
});
