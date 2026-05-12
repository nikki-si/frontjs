// Функция для получения только имени из полного ФИО
export const getFirstName = (fullName) => {
  if (!fullName) return 'Пользователь';
  // Разделяем по пробелу и берем первую часть
  const parts = fullName.trim().split(' ');
  return parts[0];
};

// Функция для приветствия в зависимости от времени суток
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
};

// Полное приветствие
export const getFullGreeting = (fullName) => {
  const firstName = getFirstName(fullName);
  const greeting = getGreeting();
  return `${greeting}, ${firstName}!`;
};
