///|
test "complete evidence supports the correct accusation" {
  assert_eq(score_accusation(1, 1, 1, 1), 100)
}

///|
test "a correct accusation with partial evidence earns partial credit" {
  assert_eq(score_accusation(1, 1, 0, 1), 70)
}

///|
test "a wrong suspect cannot win even with every clue" {
  assert_eq(score_accusation(2, 1, 1, 1), 0)
}

///|
test "at least two clues are required before an accusation" {
  assert_eq(can_accuse(1, 0, 0, 1), 0)
  assert_eq(can_accuse(1, 0, 1, 0), 0)
  assert_eq(can_accuse(1, 0, 1, 1), 1)
}

///|
test "the demo witness uses only the clues the player has found" {
  let without_audio = scripted_reply(
    "林岚", "录音里的节拍是什么意思？", 0, 0, 0,
  )
  let with_audio = scripted_reply(
    "林岚", "录音里的节拍是什么意思？", 1, 0, 0,
  )
  assert_true(!without_audio.contains("数到十二"))
  assert_true(with_audio.contains("数到十二"))
  let with_image = scripted_reply("林岚", "照片里的人是谁？", 0, 1, 0)
  assert_true(with_image.contains("维护服"))
}

///|
test "case text and evidence share one MoonBit source of truth" {
  assert_true(case_summary().contains("21:07:14"))
  assert_true(clue_title(0).contains("录音"))
  assert_true(clue_detail(2).contains("LL-07"))
  assert_true(suspect_name(1).contains("林岚"))
  assert_true(suspect_role(1).contains("工程师"))
}

///|
test "innocent witnesses do not receive the culprit's hidden truth" {
  let archivist_context = suspect_ai_context(0, 1, 1, 1)
  let engineer_context = suspect_ai_context(1, 1, 1, 1)
  assert_true(archivist_context.contains("不知道谁执行了切换"))
  assert_true(!archivist_context.contains("使用自己的 LL-07 令牌"))
  assert_true(engineer_context.contains("使用自己的 LL-07 令牌"))
  assert_true(engineer_context.contains("图像=1"))
}
