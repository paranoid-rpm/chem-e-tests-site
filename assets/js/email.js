// 1) Зарегистрируйся на https://www.emailjs.com/
// 2) Создай Email Service (Gmail/Outlook и т.п.)
// 3) Создай Email Template, добавь поля: from_name, from_email, message
// 4) Вставь сюда свои ключи:
const EMAILJS_PUBLIC_KEY = "PASTE_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "PASTE_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "PASTE_TEMPLATE_ID";

export function initContactForm(){
  const form = document.querySelector("#contactForm");
  const status = document.querySelector("#contactStatus");
  if(!form || !status) return;

  function setStatus(text, ok=true){
    status.textContent = text;
    status.style.color = ok ? "var(--brand2)" : "#ff6b6b";
  }

  // подключаем emailjs через CDN в contact.html
  emailjs.init(EMAILJS_PUBLIC_KEY);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Отправляю…");

    const payload = {
      from_name: form.name.value.trim(),
      from_email: form.email.value.trim(),
      message: form.message.value.trim()
    };

    try{
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, payload);
      setStatus("Отправлено! Проверь почту.", true);
      form.reset();
    }catch(err){
      setStatus("Ошибка отправки. Проверь ключи EmailJS и интернет.", false);
    }
  });
}
