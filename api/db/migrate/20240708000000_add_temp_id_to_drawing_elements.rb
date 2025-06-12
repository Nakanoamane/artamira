class AddTempIdToDrawingElements < ActiveRecord::Migration[7.0]
  def change
    add_column :drawing_elements, :temp_id, :string
  end
end
