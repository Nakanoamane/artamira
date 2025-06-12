class RemoveTempIdFromDrawingElements < ActiveRecord::Migration[7.1]
  def change
    remove_column :drawing_elements, :temp_id, :string
  end
end
