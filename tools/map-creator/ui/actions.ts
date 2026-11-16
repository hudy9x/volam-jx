export { icon, labelAction } from '../../ui/actions.js';
export const tools = [
  { mode: 'select', label: 'Chọn / kéo', key: 'V', hint: 'Chọn và kéo vật thể.' },
  { mode: 'place', label: 'Đặt vật thể', key: 'I', hint: 'Chọn ảnh bên trái, rồi bấm map để đặt.' },
  { mode: 'pan', label: 'Kéo khung', key: 'H', hint: 'Kéo để di chuyển góc nhìn. Giữ Space để dùng tạm.' },
  { mode: 'block', label: 'Tô vùng chặn', key: 'B', hint: 'Tô nơi nhân vật không được đi qua.' },
  { mode: 'erase', label: 'Xóa vùng chặn', key: 'E', hint: 'Xóa vùng chặn đã tô; không xóa vật thể.' },
  { mode: 'entry', label: 'Đặt điểm vào', key: 'P', hint: 'Bấm để đặt nơi nhân vật xuất hiện.' },
] as const;
