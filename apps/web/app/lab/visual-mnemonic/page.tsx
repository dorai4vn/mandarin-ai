import { MnemonicLab } from '@/hanzi/MnemonicLab';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Lab: Visual Mnemonic (M3.5)' };

/** Auth-free QC lab like the other /lab pages. Mnemonics are modern memory aids, not historical evidence. */
export default function VisualMnemonicLab() {
  return (
    <>
      <PageHeader
        title="Visual Mnemonic — QC"
        lead="10 thẻ gợi nhớ hiện đại, độc lập với dữ liệu lịch sử. Chưa có tác phẩm nào được duyệt."
      />
      <MnemonicLab />
    </>
  );
}
