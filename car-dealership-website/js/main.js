/* --- Главный Загрузчик: Запускает все функции, когда страница готова --- */
document.addEventListener('DOMContentLoaded', function() {
  setupImageGallery();      // Запускаем галерею
  setupAuthForms();         // Запускаем формы
  checkLoginState();        // Проверяем, вошел ли пользователь
  setupAuthPanelSwitcher(); // Запускаем переключатель панелей на login.html
  setupAutoCarousel();
  setupTradeInForm();
});


/* --- Лабораторная №2, Требование 1: Динамические эффекты (Галерея с каруселью) --- */
function setupImageGallery() {
  
  // Ищем `.car-image-column` (только на volvo-xc90.html)
  const galleryColumn = document.querySelector('.car-image-column');
  
  if (!galleryColumn) {
    // Если не нашли, значит мы не на странице Volvo, выходим из функции
    return; 
  }

  // --- ИСПРАВЛЕННЫЕ СЕЛЕКТОРЫ ---
  const mainImage = galleryColumn.querySelector('#main-car-image');
  const thumbnails = galleryColumn.querySelectorAll('.car-thumbnails img');
  const prevBtn = galleryColumn.querySelector('.prev'); // <-- Ищем просто .prev
  const nextBtn = galleryColumn.querySelector('.next'); // <-- Ищем просто .next
  
  if (!mainImage || !thumbnails || !prevBtn || !nextBtn) {
    // Если что-то не нашлось, выходим
    return;
  }
  
  // --- Создаем ОБЩИЙ массив всех картинок ---
  const imageUrls = [];
  // Сначала добавляем src *главной* картинки
  imageUrls.push(mainImage.src); 
  // Добавляем все МИНИАТЮРЫ, избегая дубликатов
  thumbnails.forEach(thumb => { 
    if (!imageUrls.includes(thumb.src)) {
      imageUrls.push(thumb.src);
    }
  });
  
  let currentImageIndex = 0; 

  // --- Функция для обновления главной картинки ---
  function updateMainImage(index) {
    if (index >= 0 && index < imageUrls.length) {
      mainImage.src = imageUrls[index];
      currentImageIndex = index;
    }
  }

  // 1. Клики по миниатюрам
  thumbnails.forEach((thumb) => {
    thumb.addEventListener('click', function() {
      // Ищем индекс кликнутой миниатюры в общем массиве
      const indexInMainArray = imageUrls.indexOf(thumb.src);
      if (indexInMainArray !== -1) {
        updateMainImage(indexInMainArray);
      }
    });
  });

  // 2. Клики по кнопкам-стрелкам
  prevBtn.addEventListener('click', function() {
    let newIndex = currentImageIndex - 1;
    if (newIndex < 0) {
      newIndex = imageUrls.length - 1; // Зацикливаем на конец
    }
    updateMainImage(newIndex);
  });

  nextBtn.addEventListener('click', function() {
    let newIndex = currentImageIndex + 1;
    if (newIndex >= imageUrls.length) {
      newIndex = 0; // Зацикливаем на начало
    }
    updateMainImage(newIndex);
  });
}


/* --- ЧАСТЬ 1: АВТОРИЗАЦИЯ ЧЕРЕЗ БАЗУ ДАННЫХ --- */
function setupAuthForms() {
  
  // Регистрация
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(event) {
      event.preventDefault(); 
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const messageEl = document.getElementById('register-message');

      // Отправляем данные на сервер
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Успешная регистрация') {
          messageEl.textContent = 'Вы зарегистрированы! Теперь войдите.';
          messageEl.className = 'form-message success';
        } else {
          messageEl.textContent = 'Ошибка регистрации';
          messageEl.className = 'form-message error';
        }
      });
    });
  }

  // Вход
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const messageEl = document.getElementById('login-message');

      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          sessionStorage.setItem('loggedInUser', email);
          window.location.href = 'index.html'; 
        } else {
          messageEl.textContent = 'Неверный логин или пароль';
          messageEl.className = 'form-message error';
        }
      });
    });
  }
}

/* --- TRADE-IN: КРАСИВЫЙ ВЫВОД ОШИБОК ВМЕСТО ALERT --- */
function setupTradeInForm() {
  const tradeInForm = document.getElementById('trade-in-form');
  if (!tradeInForm) return;

  const resultEl = document.getElementById('trade-in-result');

  tradeInForm.addEventListener('submit', function(event) {
    event.preventDefault();

    // Сбрасываем предыдущие сообщения (очищаем блок)
    resultEl.style.display = 'none';
    resultEl.className = ''; 
    resultEl.innerHTML = '';

    // 1. ПРОВЕРКА АВТОРИЗАЦИИ
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
      resultEl.style.display = 'block';
      resultEl.className = 'error-box';
      resultEl.innerHTML = `
        <h3>🔒 Доступ ограничен</h3>
        <p>Чтобы отправить заявку, пожалуйста, авторизуйтесь.</p>
        <a href="login.html" class="btn-small">Войти / Регистрация</a>
      `;
      return;
    }

    // 2. ПОЛУЧЕНИЕ ДАННЫХ
    const year = parseInt(document.getElementById('trade-in-year').value);
    const mileage = parseInt(document.getElementById('trade-in-mileage').value);
    const make = document.getElementById('trade-in-make').value;
    const model = document.getElementById('trade-in-model').value;
    const phone = document.getElementById('trade-in-phone').value;

    // 3. ВАЛИДАЦИЯ (ВМЕСТО ALERT)
    // Создаем функцию для показа ошибки, чтобы не дублировать код
    function showError(text) {
      resultEl.style.display = 'block';
      resultEl.className = 'error-box'; // Делаем блок красным
      resultEl.innerHTML = `<p style="margin:0;">⚠️ <b>Ошибка:</b> ${text}</p>`;
    }

    if (year < 1980 || year > 2025 || isNaN(year)) {
      showError('Укажите корректный год выпуска (от 1980 до 2025).');
      return; // Останавливаем отправку
    }

    if (mileage < 0 || isNaN(mileage)) {
      showError('Пробег не может быть отрицательным.');
      return;
    }

    if (phone.length < 10) {
      showError('Введите корректный номер телефона.');
      return;
    }

    // 4. РАСЧЕТ ЦЕНЫ
    let basePrice = 4500000;
    let yearPenalty = (2025 - year) * 70000;
    let mileagePenalty = mileage * 3;
    let finalPrice = basePrice - yearPenalty - mileagePenalty;
    if (finalPrice < 100000) finalPrice = 100000;
    const formattedPrice = finalPrice.toLocaleString('ru-RU');

    // 5. ОТПРАВКА НА СЕРВЕР
    const formData = { make, model, year, mileage, phone, userEmail: loggedInUser };

    fetch('/api/trade-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
        // УСПЕХ
        resultEl.style.display = 'block';
        resultEl.className = 'success'; // Делаем блок зеленым
        resultEl.innerHTML = `
          <p>✅ <b>Заявка успешно отправлена!</b></p>
          <p>Предварительная оценка: <strong>${formattedPrice} ₽</strong></p>
          <p class="disclaimer">Менеджер свяжется с вами по номеру ${phone}</p>
        `;
        tradeInForm.reset();
    })
    .catch(err => {
        console.error(err);
        showError('Ошибка соединения с сервером. Попробуйте позже.');
    });
  });
}


/* --- Функция проверки состояния входа (для НОВОЙ кнопки "Выйти") --- */
function checkLoginState() {
  
  // 1. Проверяем, не на странице ли мы логина. 
  if (document.getElementById('login-form')) {
    return; // Если да, то ничего не делаем
  }

  // 2. Ищем пользователя в "сессии"
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  
  // 3. Находим наше меню
  const nav = document.querySelector('.main-nav ul');
  if (!nav) return; // На всякий случай

  // 4. Находим ссылку "Войти"
  const loginLink = nav.querySelector('a[href="login.html"]');

  // 5. ЕСЛИ ПОЛЬЗОВАТЕЛЬ ВОШЕЛ:
  if (loggedInUser && loginLink) {
    
    // 5.1. Удаляем '<li><a href="login.html">Войти</a></li>'
    loginLink.parentElement.remove(); 
    
    // 5.2. Создаем <li> для приветствия
    const welcomeLi = document.createElement('li');
    // Обрезаем email до знака @ для краткости
    const username = loggedInUser.split('@')[0];
    welcomeLi.textContent = `Здравствуйте, ${username}!`;
    // Стилизуем
    welcomeLi.style.color = '#f0f0f0';
    welcomeLi.style.fontWeight = '500';
    welcomeLi.style.fontSize = '1.1rem';
    welcomeLi.style.marginRight = '15px'; // отступ
    nav.appendChild(welcomeLi);

    // 5.3. Создаем <li> для НОВОЙ анимированной кнопки "Выйти"
    const logoutLi = document.createElement('li');
    
    // 5.4. Создаем саму кнопку
    const logoutButton = document.createElement('button');
    logoutButton.className = 'logout-btn-new'; // Новый класс для CSS

    // 5.5. Добавляем HTML внутрь кнопки (Текст + Иконка)
    logoutButton.innerHTML = `
      <span class="logout-btn-text">Выйти</span>
      <span class="logout-btn-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </span>
    `;

    // 5.6. Добавляем простой обработчик клика для ВЫХОДА
    logoutButton.addEventListener('click', () => {
      sessionStorage.removeItem('loggedInUser');
      window.location.reload();
    });

    // 5.7. Собираем
    logoutLi.appendChild(logoutButton);
    nav.appendChild(logoutLi);
  }
}


/* --- Функция для переключения панелей Входа/Регистрации --- */
function setupAuthPanelSwitcher() {
  // Ищем элементы на странице
  const container = document.getElementById('auth-container');
  const registerBtn = document.getElementById('show-register');
  const loginBtn = document.getElementById('show-login');

  // Проверяем, что мы на странице логина и все кнопки на месте
  if (container && registerBtn && loginBtn) {
    
    // При клике на "Регистрация" (на оранжевой панели)
    registerBtn.addEventListener('click', () => {
      container.classList.add('active'); // Добавляем класс, запускающий CSS-анимацию
    });

    // При клике на "Войти" (на оранжевой панели)
    loginBtn.addEventListener('click', () => {
      container.classList.remove('active'); // Убираем класс
    });
  }
}

/* --- Функция для авто-прокрутки "Галереи новинок" --- */
function setupAutoCarousel() {
  // 1. Находим нашу галерею
  const gallery = document.querySelector('.absolute-gallery');
  if (!gallery) {
    return; // Если мы не на index.html, выходим
  }

  // 2. Находим первый элемент, чтобы знать, на сколько скроллить
  const firstItem = gallery.querySelector('.gallery-item');
  if (!firstItem) {
    return; // Если галерея пустая, выходим
  }

  // 3. Вычисляем ширину скролла: Ширина фото + Отступ (gap)
  const itemWidth = firstItem.offsetWidth;
  const gap = 20; // Мы задали 'gap: 20px' в CSS
  const scrollAmount = itemWidth + gap;

  let autoScrollInterval; // Переменная для хранения интервала

  // 4. Функция, которая запускает скролл
  function startScroll() {
    // Очищаем старый интервал, если он был
    clearInterval(autoScrollInterval); 

    // Запускаем новый интервал (каждые 3 секунды)
    autoScrollInterval = setInterval(() => {
      // Проверяем, не дошли ли мы до конца
      // (scrollLeft + clientWidth) - это "правый край" видимой области
      // scrollWidth - это "общая ширина" всего контента
      if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 5) {
        // Если дошли до конца, плавно возвращаемся в начало
        gallery.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // Если нет, скроллим вправо на ширину одного элемента
        gallery.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 1400); // 1000 мс = 1 секунды
  }

  // 5. Ставим на паузу при наведении мыши (для удобства)
  gallery.addEventListener('mouseenter', () => {
    clearInterval(autoScrollInterval);
  });

  // 6. Возобновляем скролл, когда мышь убрали
  gallery.addEventListener('mouseleave', () => {
    startScroll();
  });

  // 7. Запускаем скролл в первый раз
  startScroll();
}
