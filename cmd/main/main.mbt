///|
fn main {
  let all_evidence = collect_all_evidence()
  println("ECHOCASE / CASE 01")
  println(@echo_case.case_summary())
  println("\n出演角色：")
  for id in 0..<3 {
    println(
      "- " + @echo_case.suspect_name(id) + " / " + @echo_case.suspect_role(id),
    )
  }
  println("\n推理规则演示：")
  println(
    "引用三条线索并指认真正操作员，得分：" +
    @echo_case.score_accusation(1, all_evidence).to_string(),
  )
  println(
    "两条线索、未访谈时的门槛判定（0=拒绝）：" +
    @echo_case.can_accuse(3, 0).to_string(),
  )
}

///|
fn collect_all_evidence() -> Int {
  @echo_case.collect_evidence(
    @echo_case.collect_evidence(@echo_case.collect_evidence(0, 0), 1),
    2,
  )
}
