import "dotenv/config"

import mongoose from "mongoose"

import { connectToDatabase } from "../lib/mongodb"
import { DiseaseProfileModel } from "../models/DiseaseProfile"

type SeedRecord = {
  crop: "durian" | "sugarcane" | "rice"
  nameTh: string
  nameEn: string
  pathogenType: string
  overview: string
  severity: number
  spreadRisk: "low" | "medium" | "high"
  symptoms: string[]
  causes: string[]
  treatment: string[]
  prevention: string[]
  triggers: string[]
  tags: string[]
  sources: Array<{ label: string; url: string }>
}

const seedData: SeedRecord[] = [
  {
    crop: "durian",
    nameTh: "โรครากเน่าโคนเน่า",
    nameEn: "Phytophthora Root and Stem Rot",
    pathogenType: "Phytophthora palmivora (oomycete)",
    overview:
      "โรครุนแรงในสวนทุเรียนภาคใต้ของไทย เชื้อราเข้าทำลายจากดินที่อิ่มน้ำ ทำให้ใบเหลือง รากและโคนเน่า และต้นยืนตายภายในไม่กี่สัปดาห์",
    severity: 5,
    spreadRisk: "high",
    symptoms: [
      "ใบเหลืองซีดและร่วงเป็นชุดจากยอดลงมา",
      "ผิวเปลือกบริเวณโคนมียางสีน้ำตาลไหลและมีกลิ่นเปรี้ยว",
      "รากสีน้ำตาลเข้ม เนื้อยุ่ยและมีกลิ่นเหม็น",
    ],
    causes: [
      "เชื้อรา Phytophthora palmivora สะสมในดินชื้นและแพร่ได้ดีในฤดูฝน",
      "น้ำท่วมขังรอบโคนต้นทำให้ระบบรากขาดอากาศ",
      "สปอร์แพร่กระจายผ่านน้ำชลประทานและเครื่องมือที่ปนเปื้อน",
    ],
    treatment: [
      "ตัดแต่งส่วนที่เป็นโรคและพ่นเมทาแลกซิลหรือฟอสอีทิล-อะลูมิเนียมรอบโคน",
      "ขุดเปิดหน้าดินเพื่อให้อากาศถ่ายเท และกลบดินใหม่หลังจากตากแห้ง",
      "โรยปูนขาวปรับสภาพดิน แล้วรดน้ำด้วยสารป้องกันเชื้อราชนิด systemic",
    ],
    prevention: [
      "ยกร่องสูงและจัดการน้ำ ไม่ให้มีน้ำขังบริเวณโคนต้น",
      "คลุมโคนด้วยวัสดุโปร่งเพื่อคงความชื้นแต่ไม่อับน้ำ",
      "ใช้กิ่งพันธุ์ที่ผ่านการตรวจโรค และฆ่าเชื้อเครื่องมือทุกครั้ง",
    ],
    triggers: ["ฝนตกต่อเนื่องหลายวัน", "ดินเหนียวระบายน้ำไม่ดี", "สวนที่ให้น้ำแบบปล่อยขัง"],
    tags: ["root-rot", "phytophthora", "durian"],
    sources: [
      { label: "กรมวิชาการเกษตร", url: "https://www.doa.go.th" },
      { label: "Kasetsart Research on Durian Diseases", url: "https://research.ku.ac.th" },
    ],
  },
  {
    crop: "durian",
    nameTh: "โรคใบจุดเพสตาโลปซิส",
    nameEn: "Pestalotiopsis Leaf Spot",
    pathogenType: "Pestalotiopsis spp.",
    overview:
      "พบในสวนทุเรียนที่ร่มทึบ ใบชื้น เมื่อเชื้อเข้าทำลายออกดอกจะทำให้ใบหลุดเร็วและผลแตก ทำให้ผลผลิตลดลง",
    severity: 3,
    spreadRisk: "medium",
    symptoms: [
      "ใบมีจุดสีน้ำตาลเข้มตรงกลาง ขอบสีเหลืองอ่อนและมีวงแหวนซ้อน",
      "จุดค่อย ๆ แผ่รวมเป็นปื้น รูปฉีกขาด เมื่อสปอร์มากจะเห็นผงดำ",
      "ใบแก่แห้งกรอบและร่วงก่อนวัย",
    ],
    causes: [
      "เชื้อรา Pestalotiopsis spp. สะสมบนใบที่ร่วงและถูกสาดขึ้นสู่ใบใหม่",
      "ทรงพุ่มแน่น ไม่ได้ตัดแต่ง เปิดช่องให้ลมผ่านได้น้อย",
      "การให้น้ำแบบพ่นฝอยทำให้ใบเปียกชื้นนานหลายชั่วโมง",
    ],
    treatment: [
      "เด็ดใบที่มีอาการรุนแรงออกจากทรงพุ่มแล้วนำไปทำลาย",
      "พ่นสารโพรคลอราซ แมนโคเซบ หรือสโตรบิลูรินสลับกันทุก 7-10 วัน",
      "ใช้สารชีวภัณฑ์บาซิลลัส ซับทิลิสเคลือบผิวใบในช่วงระบาด",
    ],
    prevention: [
      "ตัดแต่งกิ่งให้โปร่ง ลดการคงค้างของหยดน้ำบนใบ",
      "เว้นระยะปลูกที่เหมาะสมและกำจัดวัชพืชรอบโคน",
      "หยุดให้น้ำพ่นบนทรงพุ่มในวันที่ความชื้นสูง",
    ],
    triggers: ["หมอกหรือฝนพรำต่อเนื่อง", "สวนที่ปลูกหนาแน่น", "เศษใบสะสมหนา"],
    tags: ["leaf-spot", "fungal", "durian"],
    sources: [{ label: "สวนยาง-ทุเรียนภาคใต้", url: "https://www.arda.or.th" }],
  },
  {
    crop: "durian",
    nameTh: "โรคแอนแทรคโนสทุเรียน",
    nameEn: "Durian Anthracnose",
    pathogenType: "Colletotrichum gloeosporioides",
    overview:
      "เชื้อแอนแทรคโนสเข้าทำลายใบ ดอก และผลทุเรียน โดยเฉพาะช่วงดอกบานและติดผล ทำให้ผลไหม้เป็นแผลบุ๋มและร่วงก่อนเก็บเกี่ยว",
    severity: 4,
    spreadRisk: "medium",
    symptoms: [
      "ใบอ่อนเป็นจุดไหม้รูปตา น้ำตาลเข้มและมีขอบสีเหลือง",
      "ดอกช่อเป็นสีน้ำตาล ร่วงเป็นจำนวนมาก",
      "ผลอ่อนมีจุดสีน้ำตาลดำบุ๋มลง มีวงแหวน และเนื้อข้างใต้แผลเน่า",
    ],
    causes: [
      "สปอร์เชื้อรา Colletotrichum ก่อตัวบนใบและช่อดอกในสภาพฝนสลับแดด",
      "เมล็ดพันธุ์หรือกิ่งตอนปนเปื้อน",
      "การให้น้ำแบบพ่นฝอยในช่วงออกดอก",
    ],
    treatment: [
      "พ่นสารแมนโคเซบร่วมกับคอปเปอร์หรืออะซอกซีสโตรบินช่วงเริ่มออกดอก",
      "ตัดส่วนที่ติดโรคและเผาทำลาย ลดแหล่งสปอร์",
      "คลุมผลด้วยถุงตาข่ายหลังหยุดพ่นสารเพื่อกันการปนเปื้อน",
    ],
    prevention: [
      "พรวนดินและใส่ปุ๋ยให้สมดุล เพื่อให้ยอดแข็งแรง",
      "จัดระยะให้น้ำไม่ให้โดนช่อดอกโดยตรง",
      "ใช้พันธุ์ต้านทานและทำความสะอาดอุปกรณ์หลังใช้งาน",
    ],
    triggers: ["ฝนฟ้าคะนองช่วงดอกบาน", "หมอกเช้าและแดดแรงตอนบ่าย", "สวนที่ระบายน้ำไม่ดี"],
    tags: ["anthracnose", "flower-drop", "durian"],
    sources: [{ label: "กรมส่งเสริมการเกษตร", url: "https://www.doae.go.th" }],
  },
  {
    crop: "sugarcane",
    nameTh: "โรคใบไหม้ใบลาย",
    nameEn: "Sugarcane Leaf Scald",
    pathogenType: "Xanthomonas albilineans",
    overview:
      "โรคแบคทีเรียสำคัญของไร่อ้อยในประเทศไทย แพร่ผ่านท่อนพันธุ์ ทำให้ใบแห้งเป็นริ้วขาวและต้นฟุบ ตอแตกใหม่ไม่สมบูรณ์",
    severity: 4,
    spreadRisk: "high",
    symptoms: [
      "ใบมีริ้วสีขาวแคบตามเส้นกลางใบ เรียกว่า pencil line",
      "ปลายใบแห้งไหม้เป็นรูปตัว V",
      "ข้อของลำต้นเป็นสีน้ำตาลเข้มและเกิดโพรง",
    ],
    causes: [
      "ท่อนพันธุ์ปนเปื้อน Xanthomonas albilineans",
      "เครื่องมือเกษตรมีเชื้อแบคทีเรียติดค้าง",
      "ลมแรงและฝนฟ้าคะนองพัดพาสารคัดหลั่งไปยังต้นข้างเคียง",
    ],
    treatment: [
      "ทำลายต้นที่แสดงอาการรุนแรงทั้งกอ",
      "จุ่มท่อนพันธุ์ในน้ำร้อน 50°C นาน 30 นาทีเพื่อลดเชื้อ",
      "พ่นคอปเปอร์ไฮดรอกไซด์บริเวณไร่ที่พบโรคเพื่อลดการติดเชื้อทุติยภูมิ",
    ],
    prevention: [
      "ใช้พันธุ์ต้านทาน เช่น K88-92 หรือ LK92-11",
      "ปลูกในดินร่วนระบายน้ำดี ลดความเครียดของต้น",
      "ฆ่าเชื้อมีดและเครื่องตัดทุกครั้งก่อนย้ายแปลง",
    ],
    triggers: ["ช่วงฝนสลับแดด", "ปลูกอ้อยซ้ำที่เดิมหลายปี", "ใช้ท่อนพันธุ์ตอแก่"],
    tags: ["leaf-scald", "bacterial", "sugarcane"],
    sources: [{ label: "Thai Cane & Sugar Corp.", url: "https://www.ocpb.go.th" }],
  },
  {
    crop: "sugarcane",
    nameTh: "โรคโป๊กก้าโบแอง",
    nameEn: "Pokkah Boeng",
    pathogenType: "Fusarium verticillioides complex",
    overview:
      "เชื้อราฟิวซาเรียมเข้าทำลายยอดและใบอ้อย ทำให้ใบหงิก บิดคด และปลายยอดตายเป็นรูปสามเหลี่ยม พบมากในไร่อ้อยอายุน้อยในไทย",
    severity: 3,
    spreadRisk: "medium",
    symptoms: [
      "ใบอ่อนโค้งงอ บิดตัว และมีจุดซีดตามเส้นกลางใบ",
      "ยอดตายเป็นรูปสามเหลี่ยม (top rot) และมีกลิ่นหมัก",
      "ลำอ้อยเตี้ย แตกกอตั้งแต่พื้น แต่ไม่ให้ลำสมบูรณ์",
    ],
    causes: [
      "เชื้อรา Fusarium อยู่ในเศษซากอ้อยและดิน",
      "ท่อนพันธุ์ที่ไม่ได้คัดโรคร่วมมีเชื้อแฝง",
      "ความชื้นสูงต่อเนื่องจากฝนหรือระบบสปริงเกลอร์",
    ],
    treatment: [
      "ตัดยอดที่เป็นโรคออกเผาทำลายเพื่อลดสปอร์",
      "พ่นไตรไซโคลโซลหรือคาร์เบนดาซิมในแปลงที่ระบาดหนัก",
      "ปล่อยเชื้อไตรโคเดอร์มาทางดินเพื่อกดดันฟิวซาเรียม",
    ],
    prevention: [
      "เลือกท่อนพันธุ์อายุ 8-10 เดือนที่แข็งแรง",
      "จัดการระบายน้ำและลดการใส่ไนโตรเจนเกิน",
      "หมุนเวียนปลูกพืชอื่นเพื่อลดการสะสมของเชื้อ",
    ],
    triggers: ["ฝนตกช่วงแตกกอ", "ดินหนักระบายน้ำยาก", "ใช้พันธุ์อ่อนแอ เช่น K84-200"],
    tags: ["pokkah-boeng", "fusarium", "sugarcane"],
    sources: [{ label: "ศูนย์วิจัยอ้อยและน้ำตาล", url: "https://www.thaisugarcane.com" }],
  },
  {
    crop: "sugarcane",
    nameTh: "โรคราสนิมอ้อย",
    nameEn: "Sugarcane Rust",
    pathogenType: "Puccinia melanocephala",
    overview:
      "โรคสนิมส้มทำให้ใบอ้อยมีจุดสีน้ำตาลแดงและแคบลง ส่งผลให้การสังเคราะห์แสงลดลงและน้ำหนักลำอ้อยต่ำกว่ามาตรฐาน",
    severity: 2,
    spreadRisk: "medium",
    symptoms: [
      "ใบมีจุดนูนสีน้ำตาลแดงเรียงตามเส้นใบ",
      "เมื่อขูดดูจะมีผงสปอร์สีส้ม-น้ำตาลติดมือ",
      "ใบแก่แห้งกรอบเร็ว ทำให้พุ่มโปร่ง",
    ],
    causes: [
      "สปอร์สนิมเกาะบนใบแล้วงอกในสภาพชื้นสูง",
      "ปลูกพันธุ์ไวต่อโรคและให้ปุ๋ยไนโตรเจนสูง",
      "มีหญ้าอาศัยร่วมเป็นแหล่งพักเชื้อ",
    ],
    treatment: [
      "พ่นสโตรบิลูรินหรือผสมไตรอะโซลเมื่อพบอาการแรก",
      "ตัดใบที่เป็นโรคออกเพื่อลดปริมาณสปอร์",
    ],
    prevention: [
      "ปลูกพันธุ์ต้านทานและปรับปุ๋ยให้สมดุล",
      "ลดความหนาแน่นของแถวปลูกเพื่อให้ลมผ่าน",
      "กำจัดอ้อยอาสาและวัชพืชในไร่",
    ],
    triggers: ["อากาศชื้นเย็น", "ไร่อ้อยหนาแน่น", "มีอ้อยอาสา"],
    tags: ["rust", "foliar-disease", "sugarcane"],
    sources: [{ label: "FAO Plant Protection", url: "https://www.fao.org" }],
  },
  {
    crop: "rice",
    nameTh: "โรคไหม้ข้าว",
    nameEn: "Rice Blast",
    pathogenType: "Magnaporthe oryzae",
    overview:
      "เป็นโรคที่สำคัญที่สุดของข้าวไทย ทำลายได้ทุกระยะ ตั้งแต่กล้า ใบ คอรวง และเมล็ด ทำให้ผลผลิตสูญเสียมากกว่า 50% หากไม่ควบคุม",
    severity: 5,
    spreadRisk: "high",
    symptoms: [
      "ใบมีแผลรูปตา มีศูนย์กลางสีเทาและขอบน้ำตาลเข้ม",
      "คอรวงแห้งกรอบ รวงหล่นง่าย",
      "เมล็ดลีบ น้ำหนักเบา",
    ],
    causes: [
      "เชื้อราสร้างสปอร์จำนวนมากเมื่อฝนตกสลับแดด",
      "ปลูกพันธุ์อ่อนแอและใส่ไนโตรเจนสูง",
      "ทุ่งนาไม่มีการเผาตอซังหรือลดแหล่งเชื้อ",
    ],
    treatment: [
      "พ่นไตรไซโคลโซลหรืออะซอกซีสโตรบินเมื่อพบแผลแรก",
      "ใช้สารชีวภัณฑ์บาซิลลัสหรือไตรโคเดอร์มาฉีดพ่นต้นกล้า",
    ],
    prevention: [
      "เลือกพันธุ์ต้านทาน เช่น กข43 หรือ ปทุมธานี 1",
      "ใส่ปุ๋ยตามค่าวิเคราะห์ดิน ไม่เร่งไนโตรเจนเกินจำเป็น",
      "ปลูกแบบหว่านดำแถวเพื่อลดความชื้นสะสม",
    ],
    triggers: ["ฝนตกหนักตามด้วยแดดจัด", "อุณหภูมิ 20-28°C", "พื้นที่ปลูกซ้ำ"],
    tags: ["rice-blast", "fungal", "leaf-disease"],
    sources: [{ label: "IRRI Knowledge Bank", url: "https://www.knowledgebank.irri.org" }],
  },
  {
    crop: "rice",
    nameTh: "โรคใบขีดโปร่งใส",
    nameEn: "Bacterial Leaf Blight",
    pathogenType: "Xanthomonas oryzae pv. oryzae",
    overview:
      "พบในนาข้าวเขตร้อนชื้นของไทย แบคทีเรียเข้าทางปากใบและบาดแผล ทำให้ใบแห้งเป็นริ้วเหลือง คอรวงอ่อนแอและผลผลิตลดลง",
    severity: 4,
    spreadRisk: "high",
    symptoms: [
      "ใบมีริ้วน้ำตาลอ่อนจากปลายลงมา คล้ายถูกน้ำร้อนลวก",
      "ขอบใบม้วนและมีสารคัดหลั่งเหนียวสีเหลือง",
      "คอรวงเหี่ยวและเมล็ดลีบ",
    ],
    causes: [
      "เมล็ดพันธุ์ปนเปื้อนแบคทีเรีย",
      "ฝนลมแรงพัดพาเชื้อจากต้นติดโรค",
      "แมลงปากดูดสร้างบาดแผลเปิดให้เชื้อเข้า",
    ],
    treatment: [
      "ใช้คอปเปอร์ไฮดรอกไซด์ร่วมกับสเตรปโตมัยซินพ่นเฉพาะจุด",
      "หยุดการให้น้ำแบบสาดที่ทำให้ใบเปียก",
    ],
    prevention: [
      "ขลุบเมล็ดพันธุ์ในน้ำอุ่น 50°C นาน 30 นาที",
      "ปลูกหลังไถพลิกตอซังและตากดินเพื่อลดเชื้อ",
      "ปลูกพันธุ์ต้านทานและควบคุมเพลี้ยจักจั่นปีกลายจุด",
    ],
    triggers: ["ฝนต่อเนื่อง", "ลมกรรโชก", "ใส่ปุ๋ยไนโตรเจนสูง"],
    tags: ["bacterial-blight", "rice", "leaf-disease"],
    sources: [{ label: "กรมการข้าว", url: "https://www.ricethailand.go.th" }],
  },
  {
    crop: "rice",
    nameTh: "โรคใบจุดสีน้ำตาล",
    nameEn: "Rice Brown Spot",
    pathogenType: "Bipolaris oryzae",
    overview:
      "โรคที่สัมพันธ์กับสภาพดินเสื่อมโทรมและการขาดธาตุอาหาร ใบและคอรวงมีจุดน้ำตาล ทำให้ต้นแคระ ผลผลิตลดลงโดยเฉพาะในนาปีภาคอีสาน",
    severity: 2,
    spreadRisk: "medium",
    symptoms: [
      "ใบมีจุดกลมสีน้ำตาล มีศูนย์กลางเทาและขอบเหลือง",
      "เมล็ดมีจุดสีน้ำตาลคล้ำ ทำให้คุณภาพข้าวลดลง",
      "แปลงดูซีดเหลืองและต้นเตี้ย",
    ],
    causes: [
      "เชื้อราอยู่บนเมล็ดและเศษฟาง",
      "ดินขาดซิลิกาสังกะสีและมีค่า pH ต่ำ",
      "อากาศร้อนชื้นและหมอกหนา",
    ],
    treatment: [
      "พ่นคาร์เบนดาซิมหรือโพรคลอราซเมื่อเริ่มพบอาการ",
      "แช่เมล็ดพันธุ์ในสารฆ่าเชื้อก่อนเพาะ",
    ],
    prevention: [
      "ปรับปรุงดินด้วยปูนโดโลไมท์และเพิ่มปุ๋ยโพแทสเซียม",
      "ปลูกหมุนเวียนกับพืชตระกูลถั่วเพื่อเพิ่มอินทรียวัตถุ",
      "หลีกเลี่ยงการหว่านหนาแน่นเกินไป",
    ],
    triggers: ["สภาพแล้งสลับฝน", "ดินขาดสารอาหาร", "ใช้เมล็ดพันธุ์ปีเก่า"],
    tags: ["brown-spot", "rice", "nutrient-related"],
    sources: [{ label: "IRRI Rice Doctor", url: "https://ricedoctor.irri.org" }],
  },
]

async function run() {
  await connectToDatabase()

  const results = await Promise.all(
    seedData.map(async (record) => {
      await DiseaseProfileModel.updateOne(
        { crop: record.crop, commonNameTh: record.nameTh },
        {
          $set: {
            crop: record.crop,
            commonNameTh: record.nameTh,
            commonNameEn: record.nameEn,
            pathogenType: record.pathogenType,
            overview: record.overview,
            severity: record.severity,
            spreadRisk: record.spreadRisk,
            symptoms: record.symptoms,
            causes: record.causes,
            treatment: record.treatment,
            prevention: record.prevention,
            triggers: record.triggers,
            tags: record.tags,
            sources: record.sources,
          },
        },
        { upsert: true },
      )
      return `${record.crop}:${record.nameTh}`
    }),
  )

  console.log(`Seeded/updated ${results.length} disease profiles:`)
  results.forEach((label) => console.log(` - ${label}`))

  await mongoose.disconnect()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
