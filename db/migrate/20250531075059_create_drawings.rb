class CreateDrawings < ActiveRecord::Migration[8.0]
  def change
    create_table :drawings do |t|
      t.string :title
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
