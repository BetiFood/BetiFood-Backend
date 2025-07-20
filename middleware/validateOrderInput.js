const validateOrderInput = (req, res, next) => {
  const {
    client_name,
    client_phone,
    client_address,
    location,
    sub_orders,
    payment,
    tax,
    discount,
    notes,
  } = req.body;

  const errors = [];

  // Validate required fields
  if (
    !client_name ||
    typeof client_name !== "string" ||
    client_name.trim().length === 0
  ) {
    errors.push("client_name is required and must be a non-empty string");
  }

  if (
    !client_phone ||
    typeof client_phone !== "string" ||
    client_phone.trim().length === 0
  ) {
    errors.push("client_phone is required and must be a non-empty string");
  }

  // Validate client_address structure
  if (!client_address || typeof client_address !== "object") {
    errors.push("client_address is required and must be an object");
  } else {
    if (
      !client_address.city ||
      typeof client_address.city !== "string" ||
      client_address.city.trim().length === 0
    ) {
      errors.push(
        "client_address.city is required and must be a non-empty string"
      );
    }
    if (
      !client_address.street ||
      typeof client_address.street !== "string" ||
      client_address.street.trim().length === 0
    ) {
      errors.push(
        "client_address.street is required and must be a non-empty string"
      );
    }
    if (
      !client_address.building_number ||
      typeof client_address.building_number !== "string" ||
      client_address.building_number.trim().length === 0
    ) {
      errors.push(
        "client_address.building_number is required and must be a non-empty string"
      );
    }
  }

  // Validate location structure
  if (!location || typeof location !== "object") {
    errors.push("location is required and must be an object");
  } else {
    if (
      typeof location.lat !== "number" ||
      location.lat < -90 ||
      location.lat > 90
    ) {
      errors.push(
        "location.lat is required and must be a number between -90 and 90"
      );
    }
    if (
      typeof location.lng !== "number" ||
      location.lng < -180 ||
      location.lng > 180
    ) {
      errors.push(
        "location.lng is required and must be a number between -180 and 180"
      );
    }
  }

  // Validate sub_orders array
  if (!sub_orders || !Array.isArray(sub_orders) || sub_orders.length === 0) {
    errors.push("sub_orders is required and must be a non-empty array");
  } else {
    // Validate each sub-order
    sub_orders.forEach((subOrder, index) => {
      if (!subOrder || typeof subOrder !== "object") {
        errors.push(`sub_orders[${index}] must be an object`);
        return;
      }

      // Validate cook_id
      if (!subOrder.cook_id || typeof subOrder.cook_id !== "string") {
        errors.push(
          `sub_orders[${index}].cook_id is required and must be a string`
        );
      }

      // Validate meals array
      if (
        !subOrder.meals ||
        !Array.isArray(subOrder.meals) ||
        subOrder.meals.length === 0
      ) {
        errors.push(
          `sub_orders[${index}].meals is required and must be a non-empty array`
        );
      } else {
        // Validate each meal in the sub-order
        subOrder.meals.forEach((meal, mealIndex) => {
          if (!meal || typeof meal !== "object") {
            errors.push(
              `sub_orders[${index}].meals[${mealIndex}] must be an object`
            );
            return;
          }

          if (!meal.meal_id || typeof meal.meal_id !== "string") {
            errors.push(
              `sub_orders[${index}].meals[${mealIndex}].meal_id is required and must be a string`
            );
          }

          if (
            !meal.quantity ||
            typeof meal.quantity !== "number" ||
            meal.quantity < 1
          ) {
            errors.push(
              `sub_orders[${index}].meals[${mealIndex}].quantity is required and must be a number >= 1`
            );
          }
        });
      }

      // Validate optional delivery_person_id
      if (
        subOrder.delivery_person_id &&
        typeof subOrder.delivery_person_id !== "string"
      ) {
        errors.push(
          `sub_orders[${index}].delivery_person_id must be a string if provided`
        );
      }

      // Validate delivery_fee
      if (subOrder.delivery_fee !== undefined) {
        if (
          typeof subOrder.delivery_fee !== "number" ||
          subOrder.delivery_fee < 0
        ) {
          errors.push(
            `sub_orders[${index}].delivery_fee must be a number >= 0`
          );
        }
      }

      // Validate delivery_distance_km
      if (subOrder.delivery_distance_km !== undefined) {
        if (
          typeof subOrder.delivery_distance_km !== "number" ||
          subOrder.delivery_distance_km < 0
        ) {
          errors.push(
            `sub_orders[${index}].delivery_distance_km must be a number >= 0`
          );
        }
      }
    });
  }

  // Validate optional fields
  if (payment && !["cash", "online"].includes(payment)) {
    errors.push('payment must be either "cash" or "online"');
  }

  if (tax !== undefined) {
    if (typeof tax !== "number" || tax < 0) {
      errors.push("tax must be a number >= 0");
    }
  }

  if (discount !== undefined) {
    if (typeof discount !== "number" || discount < 0) {
      errors.push("discount must be a number >= 0");
    }
  }

  if (notes && typeof notes !== "string") {
    errors.push("notes must be a string if provided");
  }

  // If there are validation errors, return them
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors,
    });
  }

  // If validation passes, continue to the next middleware
  next();
};

module.exports = validateOrderInput;
