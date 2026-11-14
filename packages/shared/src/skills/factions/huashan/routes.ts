// Hand-maintained school/role metadata: learning table, SkillDesc and loose huashan.lua.
// No icon/weapon inference. Suggested sets are CHỌN; the shared planner owns point priority.
export const HUASHAN_ROUTES = [
  {
    id: 'sword', name: 'Kiếm Tông', damageKind: 'external' as const,
    skills: [1347, 1348, 1349, 1350, 1351, 1352, 1354, 1355, 1357, 1360, 1363, 1364, 1368, 1369],
    suggested: [1349, 1350, 1347, 1351, 1354, 1355, 1360, 1363, 1368],
  },
  {
    id: 'qi', name: 'Khí Tông', damageKind: 'internal' as const,
    skills: [1372, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1384],
    suggested: [1374, 1372, 1375, 1376, 1378, 1379, 1380],
  },
];

// Generic Hoa Sơn passives / trấn phái, with no branch restriction in the loaded data.
export const HUASHAN_COMMON_SKILLS = [1358, 1365, 1370];

const NOTES: Record<number, { role?: string; desc?: string; note?: string }> = {
  1347: { note: 'Cùng icon với Vân Chưng Hà Úy; đây là chiêu gây sát thương.' },
  1348: { desc: 'Hỗ trợ giảm hồi chiêu cho Kiếm Tông.', note: 'Cùng icon với Bạch Hồng Quán Nhật. Giảm hồi chiêu chưa được hỗ trợ trong chiến đấu; Gợi ý chưa cộng chiêu này.' },
  1349: { note: 'Làm giảm mạnh hồi nội lực. Không thuộc phương án Gợi ý Khí Tông.' },
  1351: { note: 'Tự gọi Hữu Phượng Lai Nghi khi bắt đầu thi triển, theo cấp chiêu gọi.' },
  1352: { role: 'Thành phần của Kim Nhạn Hoành Không', desc: 'Thành phần được Kim Nhạn Hoành Không gọi khi bắt đầu thi triển.', note: 'Dữ liệu khai báo kích nổ; cơ chế này chưa được hỗ trợ trong chiến đấu. Không cần Gợi ý cộng điểm riêng.' },
  1355: { note: 'Cùng icon với Cao Sơn Lưu Thủy; đây là chiêu gây sát thương.' },
  1357: { desc: 'Hỗ trợ giảm hồi chiêu cho Kiếm Tông, đồng thời gọi thức phụ của Thiên Thân Đảo Huyền.', note: 'Cùng icon với Thiên Thân Đảo Huyền. Giảm hồi chiêu chưa được hỗ trợ trong chiến đấu; Gợi ý chưa cộng chiêu này.' },
  1363: { note: 'Cùng icon với Đoạt Mệnh Liên Hoàn Tam Tiên Kiếm; đây là chiêu tấn công trực tiếp. Hiện lên cấp bằng điểm kỹ năng.' },
  1364: { role: 'Bùa lợi kích hoạt kiếm pháp', desc: 'Bùa lợi tự gọi Kiếm pháp · Thái Nhạc Tam Thanh Phong khi bắt đầu; dữ liệu còn khai báo đáp trả khi bị đánh.', note: 'Cùng icon với Thái Nhạc Tam Thanh Phong nhưng là ID riêng, lên cấp bằng thục luyện. Nhánh đáp trả chưa được engine nhận diện đúng ID kỹ năng.' },
  1365: { desc: 'Bị động cứu nguy: khi sinh lực thấp có xác suất kích hoạt Lạc Nhạn Kinh Hồng để hồi sinh lực.' },
  1368: { note: 'Cùng icon với Cửu Kiếm Hợp Nhất; đây là chiêu tấn công trực tiếp. Hiện lên cấp bằng điểm kỹ năng.' },
  1369: { role: 'Bùa lợi kích hoạt kiếm pháp', desc: 'Bùa lợi tự gọi Kiếm pháp · Độc Cô Cửu Kiếm khi bắt đầu; có cơ chế tự xuất chiêu khi đánh trúng.', note: 'Cùng icon với Độc Cô Cửu Kiếm nhưng là ID riêng, lên cấp bằng thục luyện.' },
  1370: { note: 'Dữ liệu khai báo đỡ đòn; cơ chế này chưa được hỗ trợ trong chiến đấu. Gợi ý chưa cộng chiêu này.' },
  1375: { note: 'Chuyển sát thương thành nội lực chưa được hỗ trợ trong chiến đấu; Gợi ý vẫn giữ chiêu này trong tuyến hiện tại.' },
  1376: { note: 'Tự gọi Long Toàn Kiếm Khí · Công khi bắt đầu thi triển, theo cấp chiêu gọi.' },
  1377: { role: 'Thành phần của Long Toàn Kiếm Khí', desc: 'Thành phần được Long Toàn Kiếm Khí gọi khi bắt đầu thi triển.', note: 'Dữ liệu khai báo kích nổ; cơ chế này chưa được hỗ trợ trong chiến đấu. Không cần Gợi ý cộng điểm riêng.' },
  1378: { note: 'Phản sát thương vào nội lực chưa được hỗ trợ trong chiến đấu; Gợi ý vẫn giữ chiêu này trong tuyến hiện tại.' },
  1379: { note: 'Chuyển nội lực thành tăng uy lực kỹ năng chưa được hỗ trợ trong chiến đấu; Gợi ý vẫn giữ chiêu này trong tuyến hiện tại.' },
  1380: { note: 'Tự gọi Vô Cực Kiếm Khí khi bắt đầu. Cơ chế khí trường và kích nổ chưa được hỗ trợ đầy đủ.' },
  1381: { role: 'Thành phần bảo vệ / hồi phục', desc: 'Thành phần được Ma Vân Kiếm Khí gọi khi bắt đầu; dữ liệu chứa bảo vệ, tăng sinh lực và hồi sinh lực / nội lực.', note: 'Cùng icon với Thần Quang Toàn Nhiễu nhưng khác chức năng. Cơ chế khí trường chưa được hỗ trợ đầy đủ; không phải chiêu kích nổ độc lập.' },
  1384: { desc: 'Chiêu Khí Tông khai báo kích nổ khí trường quanh mình.', note: 'Cùng icon với Vô Cực Kiếm Khí nhưng khác chức năng. Kích nổ chưa được hỗ trợ trong chiến đấu; lên cấp bằng thục luyện.' },
};

export function huashanSkillInfo(id: number): { route: string; role?: string; desc?: string; note?: string } | undefined {
  const school = HUASHAN_ROUTES.find(r => r.skills.includes(id));
  const route = school?.name ?? (HUASHAN_COMMON_SKILLS.includes(id) ? 'Dùng chung' : undefined);
  return route ? { route, ...NOTES[id] } : undefined;
}
