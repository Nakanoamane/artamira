json.extract! @drawing, :id, :title, :canvas_data, :last_saved_at

json.drawing_elements_after_save @drawing_elements_after_save do |element|
  json.extract! element, :id, :element_type, :data, :created_at
end
