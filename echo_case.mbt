///|
/// Whether a clue bit has been recorded in the case state.
#export_name("has_evidence")
pub fn has_evidence(mask : Int, clue_id : Int) -> Int {
  match clue_id {
    0 => if mask == 1 || mask == 3 || mask == 5 || mask == 7 { 1 } else { 0 }
    1 => if mask == 2 || mask == 3 || mask == 6 || mask == 7 { 1 } else { 0 }
    2 => if mask >= 4 && mask <= 7 { 1 } else { 0 }
    _ => 0
  }
}

///|
/// Add a clue to the investigation state. Replaying a clue is idempotent.
#export_name("collect_evidence")
pub fn collect_evidence(mask : Int, clue_id : Int) -> Int {
  if has_evidence(mask, clue_id) == 1 {
    mask
  } else {
    match clue_id {
      0 => mask + 1
      1 => mask + 2
      2 => mask + 4
      _ => mask
    }
  }
}

///|
#export_name("evidence_count")
pub fn evidence_count(mask : Int) -> Int {
  has_evidence(mask, 0) + has_evidence(mask, 1) + has_evidence(mask, 2)
}

///|
#export_name("progress_percent")
pub fn progress_percent(mask : Int) -> Int {
  let count = evidence_count(mask)
  if count == 0 {
    0
  } else {
    (count * 100 + 1) / 3
  }
}

///|
/// Score an accusation using the evidence cited by the player. The model may
/// narrate or advise, but it never decides whether an accusation is correct.
/// Suspect IDs: 0 Shen Yao, 1 Lin Lan, 2 Zhou Yu.
#export_name("score_accusation")
pub fn score_accusation(suspect_id : Int, cited_mask : Int) -> Int {
  if suspect_id != 1 {
    0
  } else {
    let count = evidence_count(cited_mask)
    if count == 3 {
      100
    } else if count == 2 {
      70
    } else if count == 1 {
      40
    } else {
      15
    }
  }
}

///|
/// Return whether the player has collected enough evidence to make an
/// evidence-backed accusation. This stays deterministic across AI providers.
#export_name("can_accuse")
pub fn can_accuse(evidence_mask : Int, conversations : Int) -> Int {
  if evidence_count(evidence_mask) >= 2 && conversations > 0 {
    1
  } else {
    0
  }
}

///|
/// Stable case content consumed by the web interface. Keeping the canonical
/// facts here avoids the model prompt and the visible evidence drifting apart.
#export_name("case_summary")
pub fn case_summary() -> String {
  "昨夜，北塔观测站准备发出一组重要数据。21:07:14，信号突然从主线路切走，档案里只留下 8 秒录音、一张控制台照片和一份维护日志。"
}

///|
#export_name("suspect_name")
pub fn suspect_name(id : Int) -> String {
  match id {
    0 => "沈遥"
    1 => "林岚"
    2 => "周屿"
    _ => "未知人员"
  }
}

///|
#export_name("suspect_role")
pub fn suspect_role(id : Int) -> String {
  match id {
    0 => "档案管理员"
    1 => "信号工程师"
    2 => "夜班操作员"
    _ => "未登记"
  }
}

///|
#export_name("suspect_mark")
pub fn suspect_mark(id : Int) -> String {
  match id {
    0 => "沈"
    1 => "林"
    2 => "周"
    _ => "?"
  }
}

///|
#export_name("suspect_intro")
pub fn suspect_intro(id : Int) -> String {
  match id {
    0 => "负责整理旧信号记录。"
    1 => "负责观测站的路由与维护。"
    2 => "负责交接与设备巡检。"
    _ => ""
  }
}

///|
#export_name("clue_title")
pub fn clue_title(id : Int) -> String {
  match id {
    0 => "走廊录音"
    1 => "控制台照片"
    2 => "维护日志"
    _ => "未知线索"
  }
}

///|
#export_name("clue_short")
pub fn clue_short(id : Int) -> String {
  match id {
    0 => "录音波形"
    1 => "现场照片"
    2 => "机房日志"
    _ => ""
  }
}

///|
#export_name("clue_detail")
pub fn clue_detail(id : Int) -> String {
  match id {
    0 =>
      "录音末尾传来三短一长的校准音，紧接着有人低声说：“手动回路，数到十二。”这是北塔维护时才会使用的同步口令。"
    1 =>
      "检查控制台玻璃反光：北塔 3 号路由灯在切换前亮起，操作台边露出一截橙色袖口。值班记录显示，林岚当晚穿着橙色维护服。"
    2 =>
      "21:07:14，维护令牌 LL-07 将北塔 3 号从主线路切入维护回路。21:08:02，系统完成校验，原始数据仍然完整。LL-07 登记在信号工程师林岚名下。"
    _ => "没有可读取的线索。"
  }
}

///|
/// Build a prompt with only this character's knowledge. The culprit's truth is
/// deliberately withheld from innocent witnesses so the model cannot spoil it.
#export_name("suspect_ai_context")
pub fn suspect_ai_context(
  suspect_id : Int,
  audio_found : Int,
  image_found : Int,
  log_found : Int,
) -> String {
  let role_context = match suspect_id {
    0 =>
      "你是档案管理员沈遥。你当晚在档案室扫描旧记录，没有进入控制室。你听过北塔的三短一长校准音，知道‘手动回路，数到十二’是维护口令，但你不知道谁执行了切换。"
    1 =>
      "你是信号工程师林岚。你在 21:07:14 使用自己的 LL-07 令牌，把北塔 3 号信号转入维护回路，是为了保住尚未校验的原始数据。你穿着橙色维护服，也说过‘手动回路，数到十二’。你有些愧疚，但不要主动一次性讲出全部经过；被问到具体证据时，要给出符合事实的回答。"
    2 =>
      "你是夜班操作员周屿。你约在 21:00 离开控制台，穿灰色外套，没有执行路由切换。你只知道夜班交接记录可以核对时间。"
    _ =>
      "你是北塔夜班的一位普通工作人员，不掌握操作记录。"
  }
  let evidence_context = "\n共同规则：只按角色掌握的信息回答；不要编造证据、时间、身份或地点。可以迟疑和回避，但不能推翻已展示的事实。"
  let found_context = "\n玩家已检查线索（1 表示已发现）：音频=" +
    audio_found.to_string() +
    "，图像=" +
    image_found.to_string() +
    "，日志=" +
    log_found.to_string() +
    "。"
  role_context + evidence_context + found_context
}

///|
#export_name("case_solution")
pub fn case_solution() -> String {
  "林岚切换了北塔 3 号路由。她想保住未校验的原始信号，却没有及时说明，造成了一场误会。"
}

///|
/// Produce an evidence-aware demo response. This makes the game fully playable
/// without an API key while keeping suspect knowledge and dialogue rules in
/// the same MoonBit core as the scoring engine.
#export_name("scripted_reply")
pub fn scripted_reply(
  suspect : String,
  question : String,
  audio_found : Int,
  image_found : Int,
  log_found : Int,
) -> String {
  let has_audio = audio_found == 1
  let has_image = image_found == 1
  let has_log = log_found == 1
  if suspect == "林岚" {
    if has_image && question.contains("照片") {
      "你注意到橙色袖口了。那是我的维护服。我当时确实靠近过北塔 3 号，但要判断我是否切了路由，还得对上录音和日志里的时间。"
    } else if has_log &&
      (
        question.contains("日志") ||
        question.contains("令牌") ||
        question.contains("LL-07")
      ) {
      "LL-07 是我的维护令牌。那晚我确实申请过一次手动切换，但我没有把信号删掉。先听录音，再看时间戳——两件事能对上。"
    } else if has_audio &&
      (
        question.contains("录音") ||
        question.contains("十二") ||
        question.contains("节拍")
      ) {
      "这段节拍是北塔的维护口令。我说过‘数到十二’，但那是为了让接收端保持同步。至于谁触发了切换……日志会比我的记忆可靠。"
    } else if question.contains("21:07") ||
      question.contains("切换") ||
      question.contains("为什么") ||
      question.contains("动机") {
      "21:07 我在控制台附近。我把一段不完整的信号转进了维护回路，想先保住原始数据。现在看，这个决定让大家误以为信号被抹掉了。"
    } else {
      "我负责信号维护。问我一个具体时间、设备或你已经找到的线索，我会尽量回答。"
    }
  } else if suspect == "沈遥" {
    if has_audio &&
      (
        question.contains("节拍") ||
        question.contains("录音") ||
        question.contains("十二")
      ) {
      "我听到的是三短一长，像维护校准音。录音里那句‘数到十二’很关键；普通档案员不会用这个口令。"
    } else if question.contains("21:07") ||
      question.contains("在哪") ||
      question.contains("位置") {
      "我当时在档案室扫描纸本记录。门禁记录能证明我没有进入北塔，不过我听见走廊里响过一次提示音。"
    } else {
      "我整理的是旧信号档案。把图像上的反光和录音里的提示音一起看，也许比单独听任何一个人解释更有用。"
    }
  } else if question.contains("21:07") ||
    question.contains("在哪") ||
    question.contains("离开") {
    "我 21:00 左右就离开了。操作台照片里那只橙色袖口不是我的，我穿的是灰色外套。"
  } else {
    "我只负责夜班交接。最终是谁改了路由，应该能从带时间戳的日志里查出来。"
  }
}
