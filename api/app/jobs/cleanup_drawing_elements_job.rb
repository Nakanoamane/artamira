class CleanupDrawingElementsJob < ApplicationJob
  queue_as :default

  def perform(drawing_id, saved_at)
    drawing = Drawing.find_by(id: drawing_id)
    if drawing && saved_at.present?
      # saved_at より古い DrawingElement を削除
      # リアルタイム性確保のため、最新の要素は一定期間残すなどの考慮が必要な場合もあるが、
      # まずはシンプルに saved_at より古いものを削除する
      drawing.drawing_elements.where('created_at < ?', saved_at).destroy_all
      Rails.logger.info "Cleaned up DrawingElements for Drawing ##{drawing_id} older than #{saved_at}"
    elsif drawing
      # saved_at が指定されない場合、全ての DrawingElement を削除 (開発/テスト用など)
      drawing.drawing_elements.destroy_all
      Rails.logger.info "Cleaned up all DrawingElements for Drawing ##{drawing_id}"
    else
      Rails.logger.warn "Drawing ##{drawing_id} not found for CleanupDrawingElementsJob."
    end
  end
end
