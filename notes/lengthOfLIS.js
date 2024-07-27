// 2 3 1 5 6 8 7 9 4

// 2（2的前面是null）
// 2 3（3的前面是2）
// 1 3（1的前面是null）（1将2替换掉，替换的是比1大、且比1大的集合中最小的那个，即最有潜力的那个）
// 1 3 5（5的前面是3）
// 1 3 5 6（6的前面是5）
// 1 3 5 6 8（8的前面是6）
// 1 3 5 6 7（7的前面是6）
// 1 3 5 6 7 9（9的前面是7）
// 1 3 4 6 7 9 （4的前面是3）

// 最后，按照结果集中最大的那个向前追溯，得出最长的递增子序列。
// 追溯：9 7 6 5 3 2

/**
 * @param {number[]} nums
 * @return {number}
 */
const getSequence = function (nums) {
  const result = [ nums[0] ];
  const prev = [ { [nums[0]]: null } ];

  for (let i = 1; i < nums.length; i++) {
    const cur = nums[i];
    const lastRes = result[result.length - 1];

    if (cur > lastRes) {
      result.push(cur);
      prev.push({ key: cur, value: lastRes });
    } else {
      const index = result.findIndex(item => item > cur);
      result[index] = cur;
      prev.push({
        key: cur,
        value: result[index - 1]
      });
    }
  }

  const res = [ result[result.length - 1] ];
  for (let i = result.length - 1; i >= 0; i--) {
    const cur = result[i];
    const item = prev.find(item => item.key === cur);

    item.value && res.push(item.value);
  }

  return res.reverse();
};

// console.log(lengthOfLIS([ 2, 3, 1, 5, 6, 8, 7, 9, 4 ]));
console.log(getSequence([ 10, 9, 2, 5, 3, 7, 101, 18 ]));


/**
 * 仅计算长度
 * @param {number[]} nums
 * @return {number}
 */
const lengthOfLIS = function (nums) {
  const result = [ nums[0] ];

  for (let i = 1; i < nums.length; i++) {
    const cur = nums[i];
    const lastRes = result[result.length - 1];

    if (result.indexOf(cur) > -1) {
      continue;
    }

    if (cur > lastRes) {
      result.push(cur);
    } else {
      const index = result.findIndex(item => item > cur);
      result[index] = cur;
    }
  }
  return result.length;
};

console.log(lengthOfLIS([ 4, 10, 4, 3, 8, 9 ]));