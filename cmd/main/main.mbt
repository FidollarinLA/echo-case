///|
fn main {
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
    @echo_case.score_accusation(1, 1, 1, 1).to_string(),
  )
  println(
    "两条线索但没有访谈，允许提交：" +
    @echo_case.can_accuse(1, 1, 0, 0).to_string(),
  )
}
