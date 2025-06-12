class AddCanvasDataToDrawing < ActiveRecord::Migration[8.0]
  def change
    add_column :drawings, :canvas_data, :text
  end
end
