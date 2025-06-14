class DrawingChannel < ApplicationCable::Channel
  def subscribed
    if params[:drawing_id].present?
      @drawing = Drawing.find_by(id: params[:drawing_id])
      if @drawing
        stream_from "drawing_#{@drawing.id}"
        stream_for @drawing
      else
        reject
      end
    else
      reject
    end
  end

  def unsubscribed
    stop_all_streams
  end

  def draw(data)
    return unless @drawing

    begin
      drawing_element = @drawing.drawing_elements.new(
        user_id: current_user&.id,
        element_type: data['element_type'],
        data: data['element_data']
      )
      drawing_element.temp_id = data['temp_id']
      drawing_element.save!

      DrawingChannel.broadcast_to @drawing, {
        type: 'drawing_element_created',
        drawing_element: drawing_element.as_json(methods: [:temp_id])
      }
    rescue ActiveRecord::RecordInvalid => e
      # デバッグログ追加: バリデーションエラーの確認
      Rails.logger.error "ERROR: DrawingElement creation failed: #{e.message}"
      Rails.logger.error "ERROR: DrawingElement errors: #{e.record.errors.full_messages.join(', ')}"
    end
  end

  # 新しいundo_redoアクションを追加
  def undo_redo(data)
    return unless @drawing

    action_type = data['action_type']
    elements = data['elements']
    drawing_id = data['drawing_id'] # フロントエンドから渡されるdrawing_id
    client_id = data['client_id'] # フロントエンドから渡されるclient_id

    Rails.logger.info "Received undo_redo action: type=#{action_type}, elements_count=#{elements.length}, drawing_id=#{drawing_id}, client_id=#{client_id}"

    # 他のクライアントにUndo/Redoアクションと更新された要素をブロードキャスト
    DrawingChannel.broadcast_to @drawing, {
      type: 'undo_redo_action',
      action_type: action_type,
      elements: elements,
      drawing_id: drawing_id,
      user_id: current_user&.id,
      client_id: client_id # 送信者のclient_idを追加
    }
    Rails.logger.info "Broadcasted undo_redo_action to drawing_#{drawing_id} with client_id=#{client_id}"
  end
end
