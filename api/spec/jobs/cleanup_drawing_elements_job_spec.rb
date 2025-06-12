require 'rails_helper'

RSpec.describe CleanupDrawingElementsJob, type: :job do
  include ActiveJob::TestHelper

  let!(:user) { create(:user) }
  let!(:drawing) { create(:drawing, user: user) }

  before do
    # Clear any enqueued jobs before each test
    clear_enqueued_jobs
    clear_performed_jobs
  end

  describe '#perform' do
    context 'saved_at が指定された場合' do
      it '指定された時刻より古い DrawingElement を削除する' do
        # 古い要素を作成
        old_element = create(:drawing_element, drawing: drawing, created_at: 1.hour.ago)
        # 保存時刻を作成（古い要素より新しい）
        saved_at = Time.current
        # 新しい要素を作成（保存時刻と同じか、より新しい）
        new_element_1 = create(:drawing_element, drawing: drawing, created_at: saved_at - 1.second)
        new_element_2 = create(:drawing_element, drawing: drawing, created_at: saved_at)
        new_element_3 = create(:drawing_element, drawing: drawing, created_at: saved_at + 1.second)

        expect(drawing.drawing_elements.count).to eq(4) # 初期要素 + 3つの新しい要素

        perform_enqueued_jobs do
          CleanupDrawingElementsJob.perform_later(drawing.id, saved_at)
        end

        expect(drawing.drawing_elements.count).to eq(2) # 古い要素が削除されたことを確認
        expect(drawing.drawing_elements).not_to include(old_element)
        expect(drawing.drawing_elements).not_to include(new_element_1)
        expect(drawing.drawing_elements).to include(new_element_2)
        expect(drawing.drawing_elements).to include(new_element_3)
      end

      it '指定された時刻より古い DrawingElement がない場合は何も削除しない' do
        saved_at = Time.current
        new_element = create(:drawing_element, drawing: drawing, created_at: saved_at + 1.minute)

        expect(drawing.drawing_elements.count).to eq(1)

        perform_enqueued_jobs do
          CleanupDrawingElementsJob.perform_later(drawing.id, saved_at)
        end

        expect(drawing.drawing_elements.count).to eq(1)
        expect(drawing.drawing_elements).to include(new_element)
      end
    end

    context 'drawing_id が存在しない場合' do
      it 'エラーをログに記録し、何も削除しない' do
        allow(Rails.logger).to receive(:warn)
        expect do
          perform_enqueued_jobs do
            CleanupDrawingElementsJob.perform_later(99999, Time.current)
          end
        end.not_to change(DrawingElement, :count)
        expect(Rails.logger).to have_received(:warn).with("Drawing #99999 not found for CleanupDrawingElementsJob.")
      end
    end

    context 'saved_at が指定されない場合 (開発/テスト用)' do
      it '全ての DrawingElement を削除する' do
        create(:drawing_element, drawing: drawing)
        create(:drawing_element, drawing: drawing)

        expect(drawing.drawing_elements.count).to eq(2)

        perform_enqueued_jobs do
          CleanupDrawingElementsJob.perform_later(drawing.id, nil)
        end

        expect(drawing.drawing_elements.count).to eq(0)
      end
    end
  end
end
