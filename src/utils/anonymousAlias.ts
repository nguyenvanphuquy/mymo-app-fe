const ALIAS_POOL = [
  'Gió nhẹ', 'Mèo lười', 'Cú đêm', 'Ngôi sao', 'Bóng mờ',
  'Hạt cát', 'Lá rơi', 'Sóng biển', 'Mây trắng', 'Ánh trăng',
  'Bướm đêm', 'Gió thu', 'Tia nắng', 'Hơi thở', 'Lặng lẽ',
  'Vô danh', 'Bí ẩn', 'Khách lạ', 'Người qua', 'Kẻ lang thang',
];

export function pickRandomAlias(): string {
  const name = ALIAS_POOL[Math.floor(Math.random() * ALIAS_POOL.length)];
  const suffix = Math.floor(Math.random() * 900) + 100;
  return `${name} #${suffix}`;
}
