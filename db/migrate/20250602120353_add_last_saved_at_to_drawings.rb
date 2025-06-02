class AddLastSavedAtToDrawings < ActiveRecord::Migration[8.0]
  def change
    add_column :drawings, :last_saved_at, :datetime
  end
end
