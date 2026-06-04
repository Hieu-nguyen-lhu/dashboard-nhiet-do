#include "DHT.h"

// 📌 CẤU HÌNH CÁC CHÂN KẾT NỐI (GPIO)
#define DHTPIN 2          // Chân DATA của DHT22
#define DHTTYPE DHT22     // Khai báo loại cảm biến là DHT22
#define DOOR_PIN 3        // Chân nối với cảm biến từ MC-38
#define RELAY_PIN 5       // Chân điều khiển Relay (để bật còi buzz)
#define ACS_PIN 0         // Chân Analog đọc cảm biến dòng ACS712 (GPIO 0)

// 📌 CẤU HÌNH LOGIC RELAY (Thay đổi nếu còi kêu ngược)
#define RELAY_ON  HIGH
#define RELAY_OFF LOW

// 📌 CẤU HÌNH CẢM BIẾN DÒNG ACS712
const float VREF = 3.3;            // Điện áp tham chiếu ADC của ESP32 (3.3V)
const float SENSITIVITY = 0.185;   // Độ nhạy loại 5A (185mV/A). Nếu dùng loại 20A đổi thành 0.100, 30A đổi thành 0.066
const float ACS_OFFSET = 2.5 * (3.3 / 5.0); // Điểm 0 Ampe sau khi qua mạch phân áp (khoảng 1.65V)

DHT dht(DHTPIN, DHTTYPE);

unsigned long previousMillis = 0;
const long interval = 2000; // Đọc cảm biến định kỳ mỗi 2 giây

void setup() {
  // Khởi tạo Serial để debug với máy tính (chọn tốc độ 115200 trên Serial Monitor)
  Serial.begin(115200);
  delay(1000);
  Serial.println("====== HỆ THỐNG QUẢN LÝ THỰC PHẨM KHỞI ĐỘNG ======");

  // Khởi tạo cảm biến DHT22
  dht.begin();
  
  // Khấu hình chân cảm biến từ (Sử dụng Pull-up nội để giữ chân luôn ở mức HIGH khi đóng cửa)
  pinMode(DOOR_PIN, INPUT_PULLUP); 
  
  // Cấu hình chân điều khiển Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF); // Mặc định tắt còi lúc mới bật nguồn
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. KIỂM TRA TRẠNG THÁI CỬA (MC-38) LIÊN TỤC (REAL-TIME)
  int doorState = digitalRead(DOOR_PIN);

  // 2. ĐỌC ĐỊNH KỲ CÁC CẢM BIẾN KHÁC MỖI 2 GIÂY
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Đọc Nhiệt độ & Độ ẩm từ DHT22
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Đọc giá trị dòng điện từ ACS712 (Lấy trung bình 50 lần đọc để mượt dòng)
    float avgADC = 0;
    for(int i = 0; i < 50; i++) {
      avgADC += analogRead(ACS_PIN);
      delay(1);
    }
    avgADC = avgADC / 50.0;
    
    // Chuyển đổi giá trị ADC (0-4095) sang Điện áp (0-3.3V)
    float voltage = (avgADC / 4095.0) * VREF;
    // Tính toán ra dòng điện DC (Ampe)
    float current = (voltage - ACS_OFFSET) / SENSITIVITY; 
    if (current < 0.05) current = 0.0; // Lọc bỏ nhiễu nhỏ khi hệ thống đứng yên

    // --- HIỂN THỊ KẾT QUẢ LÊN SERIAL MONITOR ---
    Serial.println("\n--- THÔNG SỐ HỆ THỐNG ---");
    
    // Kiểm tra cảm biến DHT22 có hoạt động không
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ Lỗi: Không đọc được dữ liệu từ DHT22! Kiểm tra lại dây DATA.");
    } else {
      Serial.print("🌡️ Nhiệt độ: "); Serial.print(temperature, 1); Serial.println(" °C");
      Serial.print("💧 Độ ẩm: "); Serial.print(humidity, 1); Serial.println(" %");
      
      // Kịch bản test: Nếu độ ẩm quá cao (> 70%), còi sẽ hú cảnh báo
      if (humidity > 70.0) {
        Serial.println("⚠️ CẢNH BÁO: Độ ẩm quá cao! Thực phẩm có nguy cơ mốc.");
      }
    }

    // Hiển thị trạng thái cửa
    Serial.print("🚪 Cửa tủ: "); 
    if (doorState == HIGH) {
      Serial.println("ĐANG MỞ 🔓 (Hai thanh nam châm tách rời)");
    } else {
      Serial.println("ĐÃ ĐÓNG 🔒 (Hai thanh nam châm chạm nhau)");
    }

    // Hiển thị dòng điện tổng tiêu thụ từ nguồn 5V
    Serial.print("⚡ Dòng tổng tiêu thụ: "); Serial.print(current, 3); Serial.println(" A");
    Serial.println("-------------------------");

    // --- KỊCH BẢN TEST CÒI (RELAY) ---
    // Để test xem còi và relay hoạt động tốt không: 
    // Nếu cửa MỞ, ta sẽ kích Relay bật còi kêu trong 0.5 giây rồi tắt.
    if (doorState == HIGH) {
      Serial.println("🔊 Kích hoạt còi test (Do cửa đang mở)...");
      digitalWrite(RELAY_PIN, RELAY_ON);
      delay(500); // Kêu nửa giây
      digitalWrite(RELAY_PIN, RELAY_OFF);
    }
  }
}