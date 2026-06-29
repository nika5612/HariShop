import React from 'react'
import { Modal, Button } from 'react-bootstrap'

const TermsModal = ({ show, onHide }) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size='lg'
      centered
      scrollable
      contentClassName='terms-modal-content'
    >
      <Modal.Header
        closeButton
        style={{
          background: '#1a1a2e',
          borderBottom: '1px solid rgba(51,255,204,0.2)',
        }}
      >
        <Modal.Title style={{ color: '#33FFCC', fontWeight: '700', fontSize: '1.1rem' }}>
          <i className='fas fa-file-contract me-2'></i>
          Điều khoản và Chính sách — HariShop
        </Modal.Title>
      </Modal.Header>

      <Modal.Body
        style={{
          background: '#1a1a2e',
          color: '#b8bcc8',
          fontSize: '14px',
          lineHeight: '1.8',
          maxHeight: '65vh',
          overflowY: 'auto',
        }}
      >
        {/* ── 1. Giới thiệu ── */}
        <Section title='1. Giới thiệu'>
          Chào mừng bạn đến với HariShop — website thương mại điện tử chuyên cung cấp
          các sản phẩm điện thoại chính hãng. Khi sử dụng dịch vụ của chúng tôi, bạn
          đồng ý tuân thủ các điều khoản và chính sách được nêu dưới đây. Vui lòng đọc
          kỹ trước khi đặt hàng.
        </Section>

        {/* ── 2. Chính sách đặt hàng ── */}
        <Section title='2. Chính sách đặt hàng'>
          <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              Đơn hàng chỉ được xác nhận sau khi bạn nhấn nút <strong style={{ color: '#fff' }}>Đặt Hàng</strong> và
              hệ thống trả về mã đơn hàng thành công.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Khách hàng cần cung cấp đầy đủ thông tin địa chỉ giao hàng và số điện
              thoại liên hệ chính xác. HariShop không chịu trách nhiệm nếu đơn hàng
              giao thất bại do thông tin sai.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Giá hiển thị trên website là giá cuối cùng bao gồm VAT (nếu có). Phí
              vận chuyển được tính riêng dựa trên địa chỉ nhận hàng và đơn vị vận
              chuyển bạn chọn.
            </li>
            <li>
              HariShop có quyền hủy đơn hàng nếu phát hiện gian lận, thông tin sai
              lệch hoặc sản phẩm hết hàng đột xuất, và sẽ thông báo đến khách hàng
              trong vòng 24 giờ.
            </li>
          </ul>
        </Section>

        {/* ── 3. Chính sách giao hàng ── */}
        <Section title='3. Chính sách giao hàng'>
          <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              HariShop hợp tác với <strong style={{ color: '#fff' }}>GHN</strong> để vận chuyển toàn
              quốc. Thời gian giao hàng dự kiến từ <strong style={{ color: '#fff' }}>1–5 ngày</strong> làm
              việc tùy khu vực.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Phí vận chuyển được tính tự động dựa trên trọng lượng sản phẩm và địa
              chỉ nhận hàng. Phí hiển thị tại bước thanh toán là phí chính thức.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Khách hàng có thể theo dõi trạng thái đơn hàng và vận chuyển trực tiếp
              trên website tại trang <strong style={{ color: '#fff' }}>Đơn hàng của tôi</strong>.
            </li>
            <li>
              Trường hợp đơn hàng bị giao trễ hơn thời gian dự kiến quá 3 ngày, vui
              lòng liên hệ bộ phận chăm sóc khách hàng để được hỗ trợ.
            </li>
          </ul>
        </Section>

        {/* ── 4. Chính sách thanh toán ── */}
        <Section title='4. Chính sách thanh toán'>
          <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              HariShop hỗ trợ các hình thức thanh toán: <strong style={{ color: '#fff' }}>COD</strong> (thanh
              toán khi nhận hàng), <strong style={{ color: '#fff' }}>Ví MoMo</strong> và{' '}
              <strong style={{ color: '#fff' }}>Vietcombank</strong> (chuyển khoản QR).
            </li>
            <li style={{ marginBottom: '8px' }}>
              Với hình thức COD, khách hàng thanh toán trực tiếp cho nhân viên giao
              hàng. Vui lòng chuẩn bị đúng số tiền để thuận tiện cho quá trình giao nhận.
            </li>
            <li>
              Với hình thức chuyển khoản, đơn hàng sẽ được xác nhận sau khi HariShop
              nhận được xác nhận thanh toán thành công từ hệ thống.
            </li>
          </ul>
        </Section>

        {/* ── 5. Chính sách đổi trả ── */}
        <Section title='5. Chính sách đổi trả & Hoàn tiền'>
          <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              Sản phẩm được đổi trả trong vòng <strong style={{ color: '#fff' }}>7 ngày</strong> kể
              từ ngày nhận hàng nếu có lỗi kỹ thuật từ nhà sản xuất hoặc giao sai sản phẩm.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Sản phẩm đổi trả phải còn nguyên hộp, đầy đủ phụ kiện, chưa qua sử dụng
              và có hóa đơn mua hàng.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Không áp dụng đổi trả cho sản phẩm hư hỏng do người dùng (rơi vỡ, ngấm
              nước, tự ý sửa chữa).
            </li>
            <li>
              Hoàn tiền sẽ được xử lý trong vòng <strong style={{ color: '#fff' }}>3–7 ngày</strong> làm
              việc sau khi đổi trả được chấp thuận, thông qua hình thức thanh toán ban đầu.
            </li>
          </ul>
        </Section>

        {/* ── 6. Chính sách bảo mật ── */}
        <Section title='6. Chính sách bảo mật thông tin'>
          <ul style={{ paddingLeft: '20px', marginBottom: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              HariShop cam kết bảo mật thông tin cá nhân của khách hàng theo quy định
              của pháp luật Việt Nam. Thông tin của bạn chỉ được sử dụng để xử lý đơn
              hàng và cải thiện dịch vụ.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Chúng tôi không chia sẻ, bán hoặc cho thuê thông tin cá nhân của khách
              hàng cho bên thứ ba, trừ đơn vị vận chuyển để thực hiện giao hàng.
            </li>
            <li>
              Mật khẩu tài khoản được mã hóa bằng bcrypt. HariShop không bao giờ yêu
              cầu bạn cung cấp mật khẩu qua email hay điện thoại.
            </li>
          </ul>
        </Section>

        {/* ── 7. Liên hệ ── */}
        <Section title='7. Liên hệ hỗ trợ' last>
          Nếu có bất kỳ thắc mắc nào về điều khoản và chính sách, vui lòng liên hệ
          HariShop qua:
          <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: 0 }}>
            <li style={{ marginBottom: '6px' }}>
              📧 Email: <span style={{ color: '#33FFCC' }}>support@harishop.vn</span>
            </li>
            <li style={{ marginBottom: '6px' }}>
              📞 Hotline: <span style={{ color: '#33FFCC' }}>1800 xxxx</span> (8:00–22:00 hàng ngày)
            </li>
            <li>
              🏠 Địa chỉ: TP. Hồ Chí Minh, Việt Nam
            </li>
          </ul>
        </Section>
      </Modal.Body>

      <Modal.Footer
        style={{
          background: '#1a1a2e',
          borderTop: '1px solid rgba(51,255,204,0.2)',
          justifyContent: 'center',
        }}
      >
        <Button
          onClick={onHide}
          style={{
            background: '#33FFCC',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            padding: '10px 40px',
            borderRadius: '10px',
            fontSize: '15px',
          }}
        >
          <i className='fas fa-check me-2'></i>
          Đã hiểu, đóng lại
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// Helper component cho từng section
const Section = ({ title, children, last }) => (
  <div style={{ marginBottom: last ? 0 : '24px' }}>
    <h6 style={{
      color: '#33FFCC',
      fontWeight: '700',
      fontSize: '14px',
      marginBottom: '10px',
      paddingBottom: '6px',
      borderBottom: '1px solid rgba(51,255,204,0.15)',
    }}>
      {title}
    </h6>
    <div>{children}</div>
  </div>
)

export default TermsModal