extends CharacterBody2D


const SPEED = 300.0
const JUMP_VELOCITY = -400.0
const MAX_JUMPS = 2 # 1 = normal jump, 2 = double jump, 3 = triple jump...

var jump_count := 0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D


func _physics_process(delta: float) -> void:
	if is_on_floor():
		# Landed: refill the jumps.
		jump_count = 0
	else:
		# Add the gravity.
		velocity += get_gravity() * delta
		# Walked off a ledge without jumping: the ground jump is used up,
		# so only the air jump is left.
		if jump_count == 0:
			jump_count = 1

	# Handle jump (ground jump and air jump).
	if Input.is_action_just_pressed("ui_accept") and jump_count < MAX_JUMPS:
		velocity.y = JUMP_VELOCITY
		jump_count += 1

	# Get the input direction and handle the movement/deceleration.
	# As good practice, you should replace UI actions with custom gameplay actions.
	var direction := Input.get_axis("ui_left", "ui_right")
	if direction:
		velocity.x = direction * SPEED
		sprite.flip_h = direction < 0
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()
	update_animation(direction)


func update_animation(direction: float) -> void:
	if not is_on_floor():
		if velocity.y < 0 and jump_count >= 2:
			sprite.play("Double Jump")
		elif velocity.y < 0:
			sprite.play("Jump")
		else:
			sprite.play("Fall")
	elif direction:
		sprite.play("Run")
	else:
		sprite.play("Idle")
