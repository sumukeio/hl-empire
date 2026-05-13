"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const toc: { id: string; title: string }[] = [
  { id: "overview", title: "1. 帝国是什么" },
  { id: "save", title: "2. 御案与密函" },
  { id: "hud", title: "3. 顶栏御案" },
  { id: "treasury", title: "4. 国库与军费" },
  { id: "personal-expense", title: "5. 个人支用" },
  { id: "map", title: "6. 九州图志" },
  { id: "city-sheet", title: "7. 城池奏折" },
  { id: "quests", title: "8. 军机处" },
  { id: "inner-neiwufu", title: "9. 养正司与内务府" },
  { id: "logs", title: "10. 邸报与勤政录" },
  { id: "workshop", title: "11. 造办处" },
  { id: "glossary", title: "12. 名词汇编" },
];

const tableShell =
  "w-full border-collapse overflow-hidden rounded-lg border border-slate-800/90 text-left text-[12px] text-slate-300";
const thCell =
  "border-b border-slate-800/90 bg-slate-950/80 px-2.5 py-2 font-medium text-slate-200";
const tdCell = "border-b border-slate-800/60 px-2.5 py-2 align-top";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-xl border border-imperial-gold/20 bg-slate-900/45 p-4 shadow-inner sm:p-5"
    >
      <h2 className="mb-4 border-b border-imperial-gold/15 pb-2 text-base font-semibold text-imperial-gold">
        {title}
      </h2>
      <div
        className={cn(
          "space-y-3 text-sm leading-relaxed text-slate-300",
          "[&_strong]:font-semibold [&_strong]:text-slate-100",
          "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
          "[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5"
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Sub({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-slate-800/70 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-sm font-semibold tracking-tight text-slate-100">
        {title}
      </h3>
      <div className="space-y-2.5 text-sm leading-relaxed text-slate-300 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function ImperialHandbookView() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-10 border-b border-imperial-gold/15 bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
              造办处
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-border text-muted-foreground hover:bg-muted/30"
            asChild
          >
            <Link href="/dashboard">回朝</Link>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0 text-imperial-gold" aria-hidden />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-primary sm:text-xl">
                帝国手册
              </h1>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                玩法机制与名词详解（以御案所见为准）
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="本页目录">
          <div className="sticky top-24 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-slate-800/90 bg-slate-900/50 p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              目录
            </p>
            <ul className="space-y-1 text-[11px] leading-snug">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded px-2 py-1 text-slate-400 transition-colors hover:bg-imperial-gold/10 hover:text-imperial-gold"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <ScrollArea className="lg:max-h-[calc(100dvh-8rem)] lg:pr-3">
          <div className="flex flex-col gap-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-wrap gap-1.5 lg:hidden">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "rounded-full border border-imperial-gold/35 bg-slate-900/60 px-2.5 py-1.5 text-[10px] text-imperial-gold/90",
                    "hover:bg-imperial-gold/15"
                  )}
                >
                  {item.title.replace(/^\d+\.\s*/, "")}
                </a>
              ))}
            </div>

            <Section id="overview" title="1. 帝国是什么">
              <p>
                <strong>瀚翎帝国</strong>是一套把日常经营、身体状态与待办动作，包装成「朝政」的桌面御案：你是圣上，顶栏是御案摘要，中央是九州疆域，侧畔是军机与宫务。银两、体力、民心、功勋等数字，在叙事里分别对应国库、龙体、朝野观感与勤政建树；城池与政务，则对应你关心的产品线或固定习惯。
              </p>
              <Sub title="御案上常见几块版面">
                <ul>
                  <li>
                    <strong>顶栏御案</strong>：尊号与功勋、疆域与军机简报、国库与军费、邸报与勤政录、造办处入口。
                  </li>
                  <li>
                    <strong>九州图志</strong>：一座座「征战目标」城池卡片；点卡展开侧栏奏折。
                  </li>
                  <li>
                    <strong>军机与宫务</strong>：大屏在侧栏分栏；小屏从底栏抽出的半屏御案进入，纵向翻阅军机、养正司、内务府。
                  </li>
                </ul>
              </Sub>
              <Sub title="读数习惯">
                <p>
                  多数资源为整数且不为负；体力、健康、民心等常在<strong>零到一百</strong>之间封顶，表示「满则不再涨、空则见底」。具体以御案数字与邸报文案为准。
                </p>
              </Sub>
            </Section>

            <Section id="save" title="2. 御案与密函">
              <p>
                帝国记在<strong>本机御案</strong>里：换浏览器、清缓存、换设备，若无备份，疆域与功勋可能一夜回到开国前。因此造办处备有<strong>帝国密函</strong>：把当时国库、疆域、军机、邸报等一并封进一封可下载的备份文书；他日在新御案上「读取密函」，即可整包还朝。
              </p>
              <Sub title="每日上朝时会发生什么">
                <p>
                  每过<strong>一个自然日</strong>（以你设备日历为准），军机与各城「本日已办几次」会重新计日；邸报卷轴里的旧闻<strong>不会</strong>因换日而自动消失。跨日后若去撤一条昨日的军机邸报，有时会因为当日计数已清空而对不上账，撤回会失败——这是御案防篡改的保守做法，并非界面损坏。
                </p>
              </Sub>
            </Section>

            <Section id="hud" title="3. 顶栏御案">
              <Sub title="尊号与功勋">
                <p>
                  <strong>功勋</strong>是圣上累计的勤政建树，主要来自军机点卯与部分宫务。功勋推动一条<strong>「九品中正」二十五阶尊号</strong>阶梯（从布衣到超凡，正品与从品交错），与另一条「每满一百功勋升一级」的养成刻度可以同时存在：前者是朝野称呼你的名分，后者更像吏部簿上的级数。顶栏主进度条表示<strong>在当前这一阶里</strong>，离下一尊号还差多少功勋，而不是整条人生曲线的总长。
                </p>
              </Sub>
              <Sub title="简报条">
                <p>
                  一行摘要：共有几座征战目标、军机里登记了几条政务、全境粮饷单合计多少、全境度支（户部口径的银钱压力）合计多少。若开启<strong>移动行宫</strong>（游牧办公），条上会出现扎营徽章，表示在军机里办理「祖宗之法」那类模板事务时，同一份功勋会按更高成算入账（详见军机章）。
                </p>
              </Sub>
              <Sub title="已纳疆土">
                <p>
                  显示「金色藩属」城池座数占征战目标总座数之比。金色藩属是疆域经营的高光态，与沙盘卡片上的金边光晕一致。
                </p>
              </Sub>
              <Sub title="军力数字">
                <p>
                  顶栏另有帝国军力摘要，与单城兵力不是同一套叙事：前者是朝堂总册，后者是各城驻防；二者都用「兵力」隐喻，阅读沙盘时注意看卡片小字。
                </p>
              </Sub>
            </Section>

            <Section id="treasury" title="4. 国库与军费">
              <Sub title="两本账各管什么">
                <p>
                  <strong>国库储蓄</strong>：主现金池。登记工资与补贴、校准成你手边的真实现金、个人日常支用、以及部分宫务与朱批度支，都从这里出账或入账。
                </p>
                <p>
                  <strong>军费余额</strong>：单独一本「行营专款」，与国库分柜存放。顶栏钱袋旁的拨付入口，是把国库银两划进军费；城池奏折里「今日消耗」扣的是军费，不是国库。军费不足时，战报无法呈报，需先从国库拨款充实行营。
                </p>
              </Sub>
              <Sub title="户部司帑里能做什么">
                <ul>
                  <li>
                    <strong>入账岁入</strong>：把一笔收入记入国库，并留一条内务府口吻的邸报。
                  </li>
                  <li>
                    <strong>校准实存</strong>：把国库数字直接改成你清点后的现金总额，用于周对账；会留一条户部口吻的邸报。
                  </li>
                  <li>
                    <strong>个人支用</strong>：见下一章。
                  </li>
                </ul>
              </Sub>
              <Sub title="奏折朱批与国库">
                <p>
                  在城池奏折里改「度支」并保存时，若新度支比打开奏折时<strong>更高</strong>，户部会按<strong>差额</strong>从国库支银；国库见底则实付可能少于差额，邸报会写明「尚欠多少未拨」。这与「今日战报」里从军费扣的消耗是两条线：前者是朱批改账本，后者是日结行营流水。
                </p>
              </Sub>
            </Section>

            <Section id="personal-expense" title="5. 个人支用">
              <p>
                在户部司帑的「个人支用」一页，把真实花销记成御案上的<strong>银两</strong>：界面约定<strong>一元人民币对应一两银</strong>，便于心算。此处<strong>没有</strong>旧版「骄奢双倍抄没」一类惩罚；圣上若自认是高性价比、实用向支出，应选对应门类，让户部记账与属性奖励一致。
              </p>
              <table className={tableShell}>
                <thead>
                  <tr>
                    <th className={thCell}>门类</th>
                    <th className={thCell}>御案说法</th>
                    <th className={thCell}>除扣银外</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={tdCell}>御膳</td>
                    <td className={tdCell}>大内辎重，食补抗炎</td>
                    <td className={tdCell}>体力大涨一档；不打断「连续清淡饮食」的连击计数</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>常服</td>
                    <td className={tdCell}>尚衣监整肃衣冠</td>
                    <td className={tdCell}>朝野观感（民心）向好</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>利器</td>
                    <td className={tdCell}>工部神机，数码生产力</td>
                    <td className={tdCell}>人文见识（文学修养）提升</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>基建</td>
                    <td className={tdCell}>其它实在开销</td>
                    <td className={tdCell}>仅记支出，不另发属性奖</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>问道</td>
                    <td className={tdCell}>礼部安排考察行旅</td>
                    <td className={tdCell}>
                      文学大涨；并向「勤政余兴蓄池」注入能量（与军机功勋凝结翻牌券共用同一蓄池，池满有上限）
                    </td>
                  </tr>
                </tbody>
              </table>
              <Sub title="万世基石">
                <p>
                  勾选表示你自认这件东西<strong>极致性价比</strong>且预计使用<strong>五到十年</strong>。呈报后邸报句末会多缀<strong>「（镇国利器）」</strong>四字，并额外嘉奖一点民心。这是自我宣誓式的记账标签，御案不会替你鉴定真伪。
                </p>
              </Sub>
              <Sub title="问道里的地点">
                <p>
                  可写考察目的地；邸报里礼部会用括号标出。若不写，默认写成「九州」一类泛称。
                </p>
              </Sub>
            </Section>

            <Section id="map" title="6. 九州图志">
              <Sub title="征战态势四档">
                <p>每座城有一档态势，决定卡片颜色与朝野叙事：</p>
                <ul>
                  <li>
                    <strong>未知之地</strong>：尚未摸清，灰冷色调。
                  </li>
                  <li>
                    <strong>斥候侦查</strong>：已派人盯梢，琥珀色调。
                  </li>
                  <li>
                    <strong>战火纷飞</strong>：正面对抗，朱红色调。
                  </li>
                  <li>
                    <strong>金色藩属</strong>：已纳土称臣，金辉与光晕强调「藩属」成就。
                  </li>
                </ul>
              </Sub>
              <Sub title="沙盘筛选">
                <p>
                  标题下有一排可多选的态势标签，默认只亮「战火纷飞」，方便你集中看最难啃的城。可同时勾选多档；若<strong>全部熄灭</strong>，表示<strong>不筛选</strong>，全境皆显。若你正开着某城奏折，而该城被筛出去了，侧栏会<strong>自动收起</strong>，免得在看不见的地方误改军政。
                </p>
              </Sub>
              <Sub title="卡片上的小警告">
                <p>
                  若一座城有兵力却无军械，或兵力相对军械过多，卡角可能出现三角警示：隐喻「人多械少、战力虚浮」，提醒补创意与装备类投入。这是阅读提示，不自动替你改数。
                </p>
              </Sub>
              <Sub title="养心殿睡衣">
                <p>
                  未着朝服、在养心殿安歇时，沙盘可能蒙一层半透明罩子并禁止点城：表示此刻不宜理藩，先去更衣或休息。
                </p>
              </Sub>
            </Section>

            <Section id="city-sheet" title="7. 城池奏折">
              <Sub title="朱批能改什么">
                <p>
                  产品别名、备忘、度支、粮饷单数、兵力、军械、征战态势等，都在奏折里改；点「朱批保存」写回疆域并关栏。度支上调时与国库的关系见第四章。
                </p>
              </Sub>
              <Sub title="建设进度">
                <p>
                  一块「四部建设」式进度，把本城与军机里几条大线对齐：哪些政务今日已办满、哪些还欠火候。它是<strong>读条与提醒</strong>，真正的办理仍在军机处点卯。
                </p>
              </Sub>
              <Sub title="今日战报（日结）">
                <p>
                  三个框是<strong>当次呈报用的草稿</strong>，不写进持久账本本身：换一座城、过自然日、或重新打开奏折，都会回到零。呈报时：从<strong>军费</strong>扣「今日消耗」；把三笔数字分别累加到本城的度支、线索（加粉）、粮饷单；若<strong>今日出单大于零</strong>，该城直接升为<strong>金色藩属</strong>。军费不够则整单作废，只弹窗警告，不发邸报。
                </p>
                <p>
                  成功后兵部发一条带金色闪边的邸报，用文言数字总结今日度支、投诚人数与粮饷单数。
                </p>
              </Sub>
              <Sub title="藩属巡幸">
                <p>
                  仅金色藩属城可请圣驾巡幸。需龙体尚可、体力尚足、国库至少备得出一百两仪仗银。成行者耗体力、耗银、赐功勋，并向勤政余兴蓄池注入一注能量（可能触发翻牌券凝结）；民心略涨。不成行者礼部会退回理由（如不宜远行、体力不足、国库空虚等）。
                </p>
              </Sub>
            </Section>

            <Section id="quests" title="8. 军机处">
              <Sub title="主攻城池">
                <p>
                  军机一切点卯，都记在<strong>当前主攻</strong>那一座城上：必须先选定主城，按钮才亮。大屏用可搜索的下拉；小屏在底栏半屏御案里搜。
                </p>
              </Sub>
              <Sub title="时辰与政务">
                <p>
                  政务分<strong>早朝、晌午、傍晚、深夜</strong>四段时辰，是「一天里何时做这类事」的叙事格子，不是真实时钟锁死：跨日时御案会统一换日，当日次数清零重计。
                </p>
              </Sub>
              <Sub title="点卯一次意味着什么">
                <p>
                  扣一笔体力；记一笔功勋；把「本城本日这条政务办了几次」加一；功勋先入<strong>勤政余兴蓄池</strong>，池里能量积满固定档位就<strong>凝结一张翻牌券</strong>，余量留在池中。若开启移动行宫且本条属于「祖宗之法」那类模板，同一笔功勋在御案上按<strong>更高成算</strong>入账（约两成加成，取整）。
                </p>
              </Sub>
              <Sub title="本日可办几次">
                <p>
                  每条政务可设「同一自然日、同一座城内最多勘合几次」，默认常为一，亦可在造办处调高。达上限后按钮会显示本日已办满。
                </p>
              </Sub>
              <Sub title="邸报上的撤回">
                <p>
                  成功点卯往往带一条军机邸报；若条末有金色「撤回」，表示御案仍允许你收回这次点卯（体力、功勋、券与蓄池尽量复原）。跨日后当日计数已清空、或蓄池已被别的事动过，撤回可能对不上账而失败——这是御案自保，不是「过期不能撤」的戏剧设定。
                </p>
              </Sub>
            </Section>

            <Section id="inner-neiwufu" title="9. 养正司与内务府">
              <Sub title="养正司（饮食与度支）">
                <ul>
                  <li>
                    <strong>太医院</strong>：抗炎饮食小幅补体力与健康，并累积「清淡连击」；连击够高时有金色延寿邸报。劣质饮食则重创体力与健康，并<strong>打断连击</strong>。
                  </li>
                  <li>
                    <strong>户部度支</strong>：快捷记一笔「其它基建」式开销（与户部司帑里基建门类一致）；亦可把国库银转存<strong>皇室私库</strong>作巡游基金。
                  </li>
                  <li>
                    <strong>理藩院</strong>：私库够厚时可出巡人文古迹；亦有网红打卡等耗私库、无增益的叙事选项；并可开关<strong>移动行宫</strong>。
                  </li>
                  <li>
                    <strong>宗人府</strong>：拒无效社交、召见内阁换功勋与体力、以及「祸国妖姬」线——后者会腰斩私库并大伤民心，纯属高风险叙事按钮。
                  </li>
                </ul>
              </Sub>
              <Sub title="内务府（圣躬与御苑）">
                <p>
                  看龙体健康与体力条；武术修为；朝服与睡衣；御花园<strong>翻牌子</strong>消耗翻牌券开启一段娱乐计时；校场习武等。翻牌券主要来自军机勤政凝结；内务府界面会画出「蓄池进度」，让你看见离下一张券还差多少勤政余兴。
                </p>
              </Sub>
            </Section>

            <Section id="logs" title="10. 邸报与勤政录">
              <Sub title="邸报是什么">
                <p>
                  <strong>八百里加急</strong>卷轴里是时间倒序的邸报：抄录你刚做的户部、军机、造办处、宫务等大事。条数在御案上<strong>有上限</strong>（约数十到八十条量级），新抄旧删，以免卷轴无限长。
                </p>
              </Sub>
              <Sub title="语气与颜色">
                <p>
                  有的像圣旨（朱红块）、有的像户部奏销（金边闪）、有的像兵部塘报、有的像起居注。颜色与前缀帮助你在长卷里扫一眼分清缓急；不必背类型名，看句式即可。
                </p>
              </Sub>
              <Sub title="勤政录">
                <p>
                  顶栏日历进入<strong>勤政录</strong>页：按日、按周、按月筛邸报，看摘要统计，并可把当前范围内导出为墨稿或机读两种式样的文书。若跨度极大，因邸报本身有条数上限，远月可能只剩摘要感；若要<strong>全量考古</strong>，仍以帝国密函整包备份为准。
                </p>
              </Sub>
            </Section>

            <Section id="workshop" title="11. 造办处">
              <p>
                齿轮入口进入造办处，分三司一档：<strong>图志司</strong>管疆域名册（增删城池、批量拓土、雷霆削藩）；<strong>枢密院</strong>管军机条目（时辰、功勋、体力、每日可办次数、同辰内排序、批量下发大纲）；<strong>帝国档案</strong>管密函封装与读取；另附<strong>帝国手册</strong>即本页，专讲规则与名词。
              </p>
            </Section>

            <Section id="glossary" title="12. 名词汇编">
              <table className={tableShell}>
                <thead>
                  <tr>
                    <th className={thCell}>名词</th>
                    <th className={thCell}>在御案上的意思</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={tdCell}>国库储蓄</td>
                    <td className={tdCell}>主现金池；岁入、校准、个人支用、拨付军费、朱批度支上调等多与此相关</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>军费余额</td>
                    <td className={tdCell}>行营专款；与国库分柜；城池日结战报的「今日消耗」只从这里扣</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>度支</td>
                    <td className={tdCell}>单城账面上的户部度支压力；朱批上调时可能牵动国库实银</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>线索（加粉）</td>
                    <td className={tdCell}>单城累计的线索或加粉意向人数隐喻</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>粮饷（单）</td>
                    <td className={tdCell}>单城成交或出单计数隐喻；战报里出单大于零可抬升为藩属</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>兵力</td>
                    <td className={tdCell}>单城关键词或投放量级隐喻；与「军械」搭配看战力虚实</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>军械</td>
                    <td className={tdCell}>创意图、高级样式等「装备」计数隐喻</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>功勋</td>
                    <td className={tdCell}>勤政累计分；推高尊号阶梯与吏部级数</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>体力</td>
                    <td className={tdCell}>龙体行动力；军机与许多宫务都要付体力</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>健康</td>
                    <td className={tdCell}>龙体底子；过低时巡幸等大事会拒驾</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>民心</td>
                    <td className={tdCell}>朝野观感；个人支用、巡幸、妖姬线等会牵动</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>文学修养</td>
                    <td className={tdCell}>人文与见识；利器与问道等支用可抬升</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>皇室私库</td>
                    <td className={tdCell}>内帑；与国库分立；理藩院大额消费多从这里出</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>翻牌券</td>
                    <td className={tdCell}>御花园娱乐所需票证；主要由勤政余兴凝结而来</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>勤政余兴蓄池</td>
                    <td className={tdCell}>
                      军机功勋与个人「问道」支出都会注入的一口小池；池满固定档位凝结一张翻牌券，余量留在池中；池深在御案上有上限
                    </td>
                  </tr>
                  <tr>
                    <td className={tdCell}>抗炎连击</td>
                    <td className={tdCell}>连续选择清淡饮食的计数；劣质饮食会清零；个人支用选御膳不会打断此连击</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>征战目标</td>
                    <td className={tdCell}>九州图志上每一座城池；即你跟踪的一条产品线或一块业务</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>军机政务</td>
                    <td className={tdCell}>军机处列表里每一条可点卯的待办；按时辰归档</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>主攻城池</td>
                    <td className={tdCell}>军机点卯当前记在哪一座征战目标上</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>移动行宫</td>
                    <td className={tdCell}>游牧办公开关；开时祖宗之法类军机功勋加成</td>
                  </tr>
                  <tr>
                    <td className={tdCell}>帝国密函</td>
                    <td className={tdCell}>可下载、可回读的整包御案备份文书</td>
                  </tr>
                </tbody>
              </table>
            </Section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
