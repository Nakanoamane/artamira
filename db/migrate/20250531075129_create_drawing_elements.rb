class CreateDrawingElements < ActiveRecord::Migration[8.0]
  def change
    create_table :drawing_elements do |t|
      t.references :drawing, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :element_type
      t.json :data

      t.timestamps
    end
  end
end
